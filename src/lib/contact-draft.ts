import type { Contact, NewContact } from '@/lib/storage';

export type Draft = {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  group: string;
  note: string;
  leadType: 'Domestic' | 'International';
  leadLevel: 'Hot' | 'Warm' | 'Cold' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  scope: 'Bulk' | 'Small';
  phone2: string;
  email2: string;
  remark: string;
  voiceTranscript: string;
  audioUri?: string;
  products: string[];
  rawOcrLines: string[];
};

export type DraftErrors = Partial<Record<keyof Draft, string>>;

export const EMPTY_DRAFT: Draft = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  group: '',
  note: '',
  leadType: 'Domestic',
  leadLevel: 'Hot',
  scope: 'Bulk',
  phone2: '',
  email2: '',
  remark: '',
  voiceTranscript: '',
  products: [],
  rawOcrLines: [],
};

export function draftFrom(contact: Contact): Draft {
  return {
    name: contact.name,
    title: contact.title,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    website: contact.website ?? '',
    address: contact.address ?? '',
    group: contact.group ?? '',
    note: contact.note ?? '',
    leadType: contact.leadType ?? 'Domestic',
    leadLevel: (contact.leadLevel as any) ?? 'Hot',
    scope: contact.scope ?? 'Bulk',
    phone2: contact.phone2 ?? '',
    email2: contact.email2 ?? '',
    remark: contact.remark ?? '',
    voiceTranscript: contact.voiceTranscript ?? '',
    audioUri: contact.audioUri,
    products: contact.products ?? [],
    rawOcrLines: contact.rawOcrLines ?? [],
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Split a comma-separated email field into trimmed parts (empties dropped). */
export function splitEmails(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function validate(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) errors.name = 'A name is required.';
  const emails = splitEmails(draft.email);
  if (emails.length > 0 && emails.some((email) => !EMAIL_RE.test(email))) {
    errors.email = 'Use valid emails, separated by commas.';
  }
  if (draft.phone.trim() && draft.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'That phone number looks too short.';
  }
  return errors;
}

/** Trimmed payload ready for `addContact` / `updateContact`. */
export function toContact(draft: Draft, extra: Partial<NewContact> = {}): NewContact {
  const emails = splitEmails(draft.email);
  return {
    name: draft.name.trim(),
    title: draft.title.trim(),
    company: draft.company.trim(),
    email: emails.join(', '),
    phone: draft.phone.trim(),
    website: draft.website.trim() || undefined,
    address: draft.address.trim() || undefined,
    group: draft.group.trim() || undefined,
    note: draft.note.trim() || undefined,
    leadType: draft.leadType,
    leadLevel: draft.leadLevel,
    scope: draft.scope,
    phone2: draft.phone2.trim() || undefined,
    email2: draft.email2.trim() || undefined,
    remark: draft.remark.trim() || undefined,
    voiceTranscript: draft.voiceTranscript.trim() || undefined,
    audioUri: draft.audioUri,
    products: draft.products,
    rawOcrLines: draft.rawOcrLines,
    ...extra,
  };
}
