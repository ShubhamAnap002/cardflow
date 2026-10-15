import { type Draft, EMPTY_DRAFT } from '@/lib/contact-draft';

export type OcrFields = Pick<
  Draft,
  'name' | 'title' | 'company' | 'phone' | 'email' | 'website' | 'address' | 'note'
>;

export type OcrResult = {
  fields: OcrFields;
  confidence: number;
  /** Where the fields came from — useful for debugging / future UI. */
  engine?: 'mlkit' | 'cloud' | 'openai';
  /** Detected text lines for tap-to-fill assistant */
  rawLines?: string[];
  extra?: {
    phone2?: string;
    email2?: string;
    leadType?: 'Domestic' | 'International';
    scope?: 'Bulk' | 'Small';
    products?: string[];
  };
};

/** Normalize OCR email field (string, CSV, or array) into comma-separated emails. */
export function normalizeOcrEmail(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw.map((e) => String(e).trim()).filter(Boolean).join(', ');
  }
  if (typeof raw !== 'string') return '';
  return raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean)
    .join(', ');
}

export function toDraftFields(fields: Partial<OcrFields> | undefined): OcrFields {
  return {
    name: fields?.name?.trim() ?? '',
    title: fields?.title?.trim() ?? '',
    company: fields?.company?.trim() ?? '',
    phone: fields?.phone?.trim() ?? '',
    email: normalizeOcrEmail(fields?.email),
    website: fields?.website?.trim() ?? '',
    address: fields?.address?.trim() ?? '',
    note: fields?.note?.trim() ?? '',
  };
}

export function draftFromOcr(
  fields: OcrFields,
  rawLines?: string[],
  extra?: OcrResult['extra']
): Draft {
  const lines: string[] = rawLines ? [...rawLines] : [];
  [fields.company, fields.name, fields.title, fields.phone, fields.email, fields.website].forEach((f) => {
    if (f && f.trim()) lines.push(f.trim());
  });
  if (fields.address) {
    fields.address.split(/\r?\n/).forEach((a) => {
      if (a.trim()) lines.push(a.trim());
    });
  }
  if (fields.note) {
    fields.note.split(/\r?\n/).forEach((n) => {
      if (n.trim()) lines.push(n.trim());
    });
  }

  // Split multiple phone numbers if present on the card into primary phone and secondary phone2
  const phoneParts = fields.phone
    ? fields.phone.split(/[/|;\n,]+/).map((p) => p.trim()).filter(Boolean)
    : [];
  const primaryPhone = phoneParts[0] || '';
  const secondaryPhone = phoneParts.length > 1 ? phoneParts[1] : '';

  return {
    ...EMPTY_DRAFT,
    ...fields,
    phone: primaryPhone,
    phone2: extra?.phone2 || secondaryPhone,
    email2: extra?.email2 || '',
    leadType: extra?.leadType || 'Domestic',
    scope: extra?.scope || 'Bulk',
    products: extra?.products || [],
    group: '',
    rawOcrLines: Array.from(new Set(lines)).filter(Boolean),
  };
}

export function clampConfidence(value: unknown, fallback = 70): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(99, Math.round(value)));
}

/** True when OCR HTTP status should be retried by the client. */
export function isRetryableOcrStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

