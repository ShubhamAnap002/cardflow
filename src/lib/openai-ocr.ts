import { imageUriToBase64 } from '@/lib/media';
import { normalizePhoneNumber, splitPhoneNumbers } from '@/lib/crm';
import type { OcrFields, OcrResult } from '@/lib/ocr-fields';

export function getOpenAiApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    ''
  );
}

export function isOpenAiConfigured(): boolean {
  const key = getOpenAiApiKey();
  return Boolean(key && key.startsWith('sk-'));
}

export type OpenAiCardData = {
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  email2?: string;
  website?: string;
  address?: string;
  leadType?: 'Domestic' | 'International';
  scope?: 'Bulk' | 'Small';
  products?: string[];
  rawLines?: string[];
};

const OPENAI_CARD_PROMPT = `You are an expert AI specialized in scanning and extracting data from business cards for sales exhibitions (expos).
Carefully read the business card image and extract all contact and company information into a strict JSON object.

Extraction Guidelines:
1. "name": Full name of the person (clean, no titles like Dr./Mr. unless part of card name).
2. "title": Job designation / title (e.g. Director, Sales Manager, VP Marketing, Managing Director).
3. "company": Company / Organization name.
4. "phone": Exactly ONE primary mobile phone number. If Indian (+91 or 10 digits starting with 6-9), format with country code 91 and NO '+' or spaces (e.g. 919876543210). DO NOT bundle multiple numbers here.
5. "phone2": Secondary mobile or telephone number if present on card, formatted with country code digits only (no '+').
6. "email": Primary business email address.
7. "email2": Secondary email address if present.
8. "website": Official website URL (e.g. https://example.com).
9. "address": Full physical address, city, state, postal code.
10. "leadType": "International" if card is outside India or has international indicators; otherwise "Domestic".
11. "scope": "Bulk" if company is industrial / wholesale / manufacturer / large buyer; otherwise "Small".
12. "products": Array of strings representing products, services, or equipment listed on the card.
13. "rawLines": Array of all text lines detected on the card in natural reading order.

Return ONLY valid JSON matching this schema:
{
  "name": string,
  "title": string,
  "company": string,
  "phone": string,
  "phone2": string,
  "email": string,
  "email2": string,
  "website": string,
  "address": string,
  "leadType": "Domestic" | "International",
  "scope": "Bulk" | "Small",
  "products": string[],
  "rawLines": string[]
}`;

export async function scanCardWithOpenAi(uri: string): Promise<OcrResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key is missing. Configure EXPO_PUBLIC_OPENAI_API_KEY in .env');
  }

  const base64 = await imageUriToBase64(uri);
  if (!base64 || base64.length < 50) {
    throw new Error('Could not read image file for OpenAI scanning.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: OPENAI_CARD_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all contact, business, and product details from this business card into JSON.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || `OpenAI API returned status ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const parsed = parseOpenAiCardJson(content);
    return mapOpenAiCardData(parsed);
  } catch (err: unknown) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Safely parse JSON from model output, handling markdown code fences, whitespace, and raw objects.
 */
export function parseOpenAiCardJson(content: string): Record<string, any> {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('AI returned an invalid JSON response format.');
  }
}

/**
 * Maps raw model response with comprehensive key synonyms, phone normalization,
 * product extraction, and rich rawLines for the Tap-to-Fill assistant.
 */
export function mapOpenAiCardData(raw: Record<string, any>): OcrResult {
  const rawName =
    raw.name ||
    raw.fullName ||
    raw.full_name ||
    raw.contactName ||
    raw.contact_name ||
    raw.personName ||
    raw.contact_person ||
    '';

  const rawTitle =
    raw.title ||
    raw.jobTitle ||
    raw.job_title ||
    raw.designation ||
    raw.position ||
    raw.role ||
    '';

  const rawCompany =
    raw.company ||
    raw.companyName ||
    raw.company_name ||
    raw.organization ||
    raw.organizationName ||
    raw.organization_name ||
    raw.businessName ||
    raw.firm ||
    '';

  const rawPhone =
    raw.phone ||
    raw.mobile ||
    raw.mobilePhone ||
    raw.mobileNumber ||
    raw.mobile_number ||
    raw.phoneNumber ||
    raw.phone_number ||
    raw.contactNumber ||
    raw.tel ||
    '';

  const rawPhone2Candidate =
    raw.phone2 ||
    raw.secondaryPhone ||
    raw.secondary_phone ||
    raw.mobile2 ||
    raw.altPhone ||
    raw.alt_phone ||
    raw.telephone ||
    raw.officePhone ||
    raw.landline ||
    '';

  const phoneList = splitPhoneNumbers(String(rawPhone));
  const primaryPhone = phoneList[0] || normalizePhoneNumber(String(rawPhone));
  const rawPhone2 = rawPhone2Candidate || (phoneList.length > 1 ? phoneList[1] : '');
  const secondaryPhone = normalizePhoneNumber(String(rawPhone2));

  const rawEmail =
    raw.email ||
    raw.emailAddress ||
    raw.email_address ||
    raw.mail ||
    raw.primaryEmail ||
    '';

  const rawEmail2 =
    raw.email2 ||
    raw.secondaryEmail ||
    raw.secondary_email ||
    raw.altEmail ||
    '';

  const rawWebsite =
    raw.website ||
    raw.web ||
    raw.url ||
    raw.site ||
    raw.websiteUrl ||
    raw.website_url ||
    '';

  const rawAddress =
    raw.address ||
    raw.fullAddress ||
    raw.full_address ||
    raw.location ||
    raw.officeAddress ||
    raw.streetAddress ||
    '';

  const rawLeadType = String(raw.leadType || raw.type || '').toLowerCase();
  const leadType: 'Domestic' | 'International' =
    rawLeadType.includes('international') || rawLeadType.includes('export')
      ? 'International'
      : 'Domestic';

  const rawScope = String(raw.scope || raw.dealScope || '').toLowerCase();
  const scope: 'Bulk' | 'Small' =
    rawScope.includes('small') || rawScope.includes('retail')
      ? 'Small'
      : 'Bulk';

  let productsList: string[] = [];
  const rawProducts = raw.products || raw.services || raw.productList || raw.equipment;
  if (Array.isArray(rawProducts)) {
    productsList = rawProducts
      .map((p) => (typeof p === 'string' ? p.trim() : String(p?.name || p || '')))
      .filter(Boolean);
  } else if (typeof rawProducts === 'string' && rawProducts.trim()) {
    productsList = rawProducts.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  }

  const rawLinesSet = new Set<string>();
  if (Array.isArray(raw.rawLines)) {
    raw.rawLines.forEach((l: any) => {
      const s = String(l || '').trim();
      if (s) rawLinesSet.add(s);
    });
  }

  // Ensure every extracted contact field is available as a selectable tap-to-fill line
  [rawCompany, rawName, rawTitle, rawPhone, rawPhone2Candidate, rawEmail, rawEmail2, rawWebsite].forEach((val) => {
    const s = String(val || '').trim();
    if (s.length > 1) rawLinesSet.add(s);
  });
  if (rawAddress) {
    String(rawAddress)
      .split(/\r?\n/)
      .forEach((a) => {
        const s = a.trim();
        if (s.length > 1) rawLinesSet.add(s);
      });
  }

  const fields: OcrFields = {
    name: String(rawName).trim(),
    title: String(rawTitle).trim(),
    company: String(rawCompany).trim(),
    phone: primaryPhone,
    email: String(rawEmail).trim(),
    website: String(rawWebsite).trim(),
    address: String(rawAddress).trim(),
    note: String(raw.note || '').trim(),
  };

  return {
    fields,
    confidence: 96,
    engine: 'openai',
    rawLines: Array.from(rawLinesSet),
    extra: {
      phone2: secondaryPhone || undefined,
      email2: String(rawEmail2).trim() || undefined,
      leadType,
      scope,
      products: productsList,
    },
  };
}
