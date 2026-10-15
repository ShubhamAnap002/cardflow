import type { OcrFields } from '@/lib/ocr-fields';
import { clampConfidence, toDraftFields } from '@/lib/ocr-fields';

function clean(s: unknown): string {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const COMPANY_RE =
  /\b(inc|llc|ltd|pvt|corp|llp|limited|private|company|technologies|solutions|labs|studio|group|agency)\b/i;
const TITLE_RE =
  /\b(founder|ceo|cto|cfo|coo|manager|director|engineer|designer|sales|marketing|partner|consultant|officer|head|lead|vp|president|executive)\b/i;
const ADDRESS_RE =
  /\b(road|street|st\.|floor|fl\.|city|nagar|marg|lane|avenue|ave|sector|plot|pin)\b/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const WEBSITE_RE = /(?:https?:\/\/|www\.)[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?/i;

export function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function looksLikeWebsite(value: string): boolean {
  const v = value.trim();
  if (!v || v.includes('@')) return false;
  return WEBSITE_RE.test(v) || /^[a-z0-9.-]+\.(com|in|org|net|io|co)\b/i.test(v);
}

export function looksLikeAddress(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeEmail(v) || looksLikePhone(v)) return false;
  return ADDRESS_RE.test(v) || /\b\d{5,6}\b/.test(v);
}

export function looksLikeCompany(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeEmail(v) || looksLikePhone(v)) return false;
  return COMPANY_RE.test(v);
}

export function looksLikeTitle(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeCompany(v) || looksLikeEmail(v)) return false;
  return TITLE_RE.test(v) && v.length < 60;
}

const NAME_STOP = new Set([
  'the', 'a', 'an', 'we', 'our', 'your', 'and', 'for', 'with', 'to', 'of', 'in', 'on', 'at', 'by',
]);

/** 2–4 letter-words only. Slogans and one-word lines are not a person name. */
export function looksLikePersonName(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeCompany(v) || looksLikeTitle(v) || looksLikeEmail(v)) return false;
  if (/\d/.test(v)) return false;
  const words = v.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (words.some((w) => NAME_STOP.has(w.toLowerCase()))) return false;
  return words.every((w) => /^[A-Z][A-Za-z.'-]{0,30}$/.test(w));
}

function uniqueJoin(parts: string[], sep = ', '): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = clean(part);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.join(sep);
}

/** Map a line only when it matches a field. Everything else stays in note. */
export function parseBusinessCardText(text: string): OcrFields {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emails: string[] = [];
  const phones: string[] = [];
  const websites: string[] = [];
  const addresses: string[] = [];
  const names: string[] = [];
  const titles: string[] = [];
  const companies: string[] = [];
  const notes: string[] = [];

  for (const line of lines) {
    const emailMatches = [...line.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(
      (m) => m[0]
    );
    if (emailMatches.length) {
      emails.push(...emailMatches);
      const rest = clean(line.replace(EMAIL_RE, ''));
      if (rest && !/^[:|-]+$/.test(rest)) notes.push(rest);
      continue;
    }

    const phoneMatch = line.match(/(\+?\d[\d\s().-]{7,}\d)/);
    if (phoneMatch && looksLikePhone(phoneMatch[1])) {
      phones.push(clean(phoneMatch[1]));
      continue;
    }

    if (looksLikeWebsite(line)) {
      websites.push(clean(line.match(WEBSITE_RE)?.[0] || line));
      continue;
    }

    if (looksLikeAddress(line)) {
      addresses.push(line);
      continue;
    }

    if (looksLikeCompany(line)) {
      companies.push(line);
      continue;
    }

    if (looksLikeTitle(line)) {
      titles.push(line);
      continue;
    }

    if (looksLikePersonName(line)) {
      names.push(line);
      continue;
    }

    notes.push(line);
  }

  return toDraftFields({
    name: names[0] || '',
    title: titles[0] || '',
    company: companies[0] || '',
    phone: uniqueJoin(phones),
    email: uniqueJoin(emails),
    website: websites[0] || '',
    address: addresses[0] || '',
    note: uniqueJoin(
      [...names.slice(1), ...titles.slice(1), ...companies.slice(1), ...addresses.slice(1), ...websites.slice(1), ...notes],
      '\n'
    ),
  });
}

export function estimateLocalOcrConfidence(fields: OcrFields, rawText: string): number {
  let score = 30;
  if (fields.email && looksLikeEmail(fields.email)) score += 25;
  if (fields.phone && looksLikePhone(fields.phone)) score += 20;
  if (fields.name && looksLikePersonName(fields.name)) score += 20;
  if (fields.company && looksLikeCompany(fields.company)) score += 5;
  if (rawText.length > 40) score += 5;
  return clampConfidence(score);
}

/**
 * Skip cloud only when the name is a real person-name and we have email or phone.
 */
export function isLocalOcrStrongEnough(fields: OcrFields, confidence: number): boolean {
  if (confidence < 70) return false;
  if (!looksLikePersonName(fields.name)) return false;
  return Boolean(fields.email.trim() || fields.phone.trim());
}
