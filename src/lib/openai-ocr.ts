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

    const parsed: OpenAiCardData = JSON.parse(content);

    // Normalize phone numbers strictly without '+' and single mobile mapping
    const rawPhone = parsed.phone || '';
    const phoneList = splitPhoneNumbers(rawPhone);
    const primaryPhone = phoneList[0] || normalizePhoneNumber(rawPhone);

    const rawPhone2 = parsed.phone2 || (phoneList.length > 1 ? phoneList[1] : '');
    const secondaryPhone = normalizePhoneNumber(rawPhone2);

    const fields: OcrFields = {
      name: parsed.name?.trim() || '',
      title: parsed.title?.trim() || '',
      company: parsed.company?.trim() || '',
      phone: primaryPhone,
      email: parsed.email?.trim() || '',
      website: parsed.website?.trim() || '',
      address: parsed.address?.trim() || '',
      note: '',
    };

    const rawLines = Array.isArray(parsed.rawLines)
      ? parsed.rawLines.map((l) => String(l).trim()).filter(Boolean)
      : [];

    return {
      fields,
      confidence: 96,
      engine: 'openai',
      rawLines,
      extra: {
        phone2: secondaryPhone || undefined,
        email2: parsed.email2?.trim() || undefined,
        leadType: parsed.leadType === 'International' ? 'International' : 'Domestic',
        scope: parsed.scope === 'Small' ? 'Small' : 'Bulk',
        products: Array.isArray(parsed.products) ? parsed.products.map(String).filter(Boolean) : [],
      },
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    throw err;
  }
}
