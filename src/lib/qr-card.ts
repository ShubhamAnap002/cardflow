import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_DRAFT, type Draft } from '@/lib/contact-draft';
import type { Profile } from '@/lib/storage';

const QR_DRAFT_KEY = 'cardflow.qrDraft.v1';

/** In-memory copy so Strict Mode remounts can re-read before clear. */
let memoryDraft: Draft | null = null;

/** Survives component remount — set when Review has loaded a staged draft. */
let reviewSessionApplied = false;

export type QrParseResult =
  | { kind: 'contact'; draft: Draft; note?: string }
  | { kind: 'url'; url: string }
  | { kind: 'unknown'; raw: string };

/** Soft cap so junk / PHOTO-bloated payloads do not fill AsyncStorage. */
const MAX_QR_PAYLOAD_CHARS = 8_000;

/** Escape a vCard TEXT value (RFC 6350). */
function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function unescapeVCard(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/** Minimal quoted-printable decode for vCard values (UTF-8 when CHARSET says so). */
function decodeQuotedPrintable(value: string, utf8 = true): string {
  const cleaned = value.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(i + 1, i + 3))) {
      bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(cleaned.charCodeAt(i));
    }
  }
  if (utf8 && typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('utf-8').decode(Uint8Array.from(bytes));
    } catch {
      // fall through
    }
  }
  return String.fromCharCode(...bytes);
}

function vCardPropName(left: string): string {
  return left
    .split(';')[0]!
    .toUpperCase()
    .replace(/^ITEM\d+\./, '');
}

export type QrDetailMode = 'full' | 'limited';

/** Soft cap so Full QR with long notes still scans on most phones. */
export const MAX_VCARD_NOTE_CHARS = 400;

/**
 * Limited omits email — only use it when name or phone remains so the QR stays importable.
 */
export function resolveQrDetailMode(
  fields: { name?: string; phone?: string },
  requested: QrDetailMode
): QrDetailMode {
  if (requested !== 'limited') return 'full';
  if (fields.name?.trim() || fields.phone?.trim()) return 'limited';
  return 'full';
}

export function canUseLimitedQr(fields: { name?: string; phone?: string }): boolean {
  return Boolean(fields.name?.trim() || fields.phone?.trim());
}

/**
 * Encode contact/profile fields as a standard vCard 3.0 string.
 * Default / `full` = all available fields.
 * `limited` = name + phone + website only (falls back to full via `resolveQrDetailMode`).
 */
export function encodeAsVCard(
  fields: {
    name: string;
    title?: string;
    company?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    note?: string;
  },
  mode: QrDetailMode = 'full'
): string {
  const effective = resolveQrDetailMode(fields, mode);
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const website = fields.website?.trim();
  let name = fields.name.trim();
  if (!name && website) {
    name = contactNameFromUrl(/^https?:\/\//i.test(website) ? website : `https://${website}`);
  }
  if (name) {
    lines.push(`FN:${escapeVCard(name)}`);
    const parts = name.split(/\s+/);
    const family = parts.length > 1 ? parts[parts.length - 1]! : '';
    const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : name;
    lines.push(`N:${escapeVCard(family)};${escapeVCard(given)};;;`);
  }
  if (effective === 'full') {
    const title = fields.title?.trim();
    if (title) lines.push(`TITLE:${escapeVCard(title)}`);
    const company = fields.company?.trim();
    if (company) lines.push(`ORG:${escapeVCard(company)}`);
    const email = fields.email?.trim();
    if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(email)}`);
  }
  const phone = fields.phone?.trim();
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`);
  if (website) lines.push(`URL:${escapeVCard(website)}`);
  if (effective === 'full') {
    const address = fields.address?.trim();
    if (address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(address)};;;;`);
    const note = fields.note?.trim();
    if (note) {
      lines.push(`NOTE:${escapeVCard(note.slice(0, MAX_VCARD_NOTE_CHARS))}`);
    }
  }
  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * Encode the user's CardFlow profile as a standard vCard 3.0 string.
 * Other phone cameras can often "Add contact" from this QR.
 */
export function encodeProfileAsVCard(
  profile: Profile,
  mode: QrDetailMode = 'full'
): string {
  return encodeAsVCard(profile, mode);
}

/** Better label for URL QRs — prefer path segment over bare domain. */
export function contactNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, '');
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length >= 2) {
      const label = decodeURIComponent(last)
        .replace(/\+/g, ' ')
        .replace(/[-_]+/g, ' ')
        .trim();
      if (label && !/^(index|home|www|id)$/i.test(label)) {
        return label.slice(0, 80);
      }
    }
    return host || 'Web link';
  } catch {
    return 'Web link';
  }
}

/** Draft for “Save this link” after scanning a URL QR. */
export function draftFromWebsiteUrl(url: string): Draft {
  return draftFromPartial({
    name: contactNameFromUrl(url),
    website: url.trim(),
    note: `Profile link: ${url.trim()}`,
  });
}

function draftFromPartial(fields: Partial<Draft>): Draft {
  return {
    ...EMPTY_DRAFT,
    name: fields.name?.trim() ?? '',
    title: fields.title?.trim() ?? '',
    company: fields.company?.trim() ?? '',
    email: fields.email?.trim() ?? '',
    phone: fields.phone?.trim() ?? '',
    website: fields.website?.trim() ?? '',
    address: fields.address?.trim() ?? '',
    group: fields.group?.trim() ?? '',
    note: fields.note?.trim() ?? '',
  };
}

function parseCardflowJson(raw: string): Draft | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data == null || typeof data !== 'object') return null;
    if (Number(data.v) !== 1) return null;
    // Accept app=cardflow or omit (older / compact payloads).
    if (data.app != null && data.app !== 'cardflow') return null;
    const draft = draftFromPartial({
      name: typeof data.name === 'string' ? data.name : '',
      title: typeof data.title === 'string' ? data.title : '',
      company: typeof data.company === 'string' ? data.company : '',
      email: typeof data.email === 'string' ? data.email : '',
      phone: typeof data.phone === 'string' ? data.phone : '',
      website: typeof data.website === 'string' ? data.website : '',
      address: typeof data.address === 'string' ? data.address : '',
      note: typeof data.note === 'string' ? data.note : '',
    });
    if (!draft.name && !draft.email && !draft.phone) return null;
    return draft;
  } catch {
    return null;
  }
}

/**
 * Drop binary-heavy properties (PHOTO etc.) so large contact QRs still parse.
 * Also unfolds continued lines.
 */
function prepareVCardText(raw: string): string | null {
  if (!/BEGIN:VCARD/i.test(raw) || !/END:VCARD/i.test(raw)) return null;
  const unfolded = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]+/g, '');
  const kept: string[] = [];
  for (const line of unfolded.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon < 0) {
      kept.push(trimmed);
      continue;
    }
    const prop = vCardPropName(trimmed.slice(0, colon));
    if (prop === 'PHOTO' || prop === 'LOGO' || prop === 'SOUND' || prop === 'KEY' || prop === 'CERT') {
      continue;
    }
    kept.push(trimmed);
  }
  return kept.join('\n');
}

function parseVCard(raw: string): Draft | null {
  const prepared = prepareVCardText(raw);
  if (!prepared) return null;

  const fields: Partial<Draft> = {};

  for (const line of prepared.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^BEGIN:/i.test(trimmed) || /^END:/i.test(trimmed) || /^VERSION:/i.test(trimmed)) {
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon < 0) continue;
    const left = trimmed.slice(0, colon);
    let value = trimmed.slice(colon + 1).trim();
    if (!value) continue;

    if (/ENCODING=QUOTED-PRINTABLE/i.test(left)) {
      const utf8 = !/CHARSET=ISO-8859/i.test(left);
      value = decodeQuotedPrintable(value, utf8);
    }
    value = unescapeVCard(value);
    if (!value) continue;

    const prop = vCardPropName(left);
    if (prop === 'FN' && !fields.name) fields.name = value;
    else if (prop === 'N' && !fields.name) {
      const [family, given] = value.split(';');
      fields.name = [given, family].filter(Boolean).join(' ').trim() || value;
    } else if (prop === 'TITLE' && !fields.title) fields.title = value;
    else if (prop === 'ORG' && !fields.company) fields.company = value.split(';')[0]!.trim();
    else if (prop === 'EMAIL' && !fields.email) fields.email = value;
    else if (prop === 'TEL' && !fields.phone) fields.phone = value;
    else if ((prop === 'URL' || prop === 'WEB') && !fields.website) fields.website = value;
    else if (prop === 'ADR' && !fields.address) {
      fields.address = value
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean)
        .join(', ');
    } else if (prop === 'NOTE' && !fields.note) fields.note = value;
  }

  const draft = draftFromPartial(fields);
  if (!draft.name && !draft.email && !draft.phone) return null;
  return draft;
}

/** MECARD:N:Name;TEL:…;EMAIL:…;ORG:…;URL:…;; */
function parseMecard(raw: string): Draft | null {
  const trimmed = raw.trim();
  if (!/^MECARD:/i.test(trimmed)) return null;
  const body = trimmed.replace(/^MECARD:/i, '');
  const fields: Partial<Draft> = {};
  for (const part of body.split(';')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const colon = chunk.indexOf(':');
    if (colon < 0) continue;
    const key = chunk.slice(0, colon).toUpperCase();
    const value = chunk.slice(colon + 1).trim();
    if (!value) continue;
    if (key === 'N' && !fields.name) fields.name = value;
    else if (key === 'TEL' && !fields.phone) fields.phone = value;
    else if (key === 'EMAIL' && !fields.email) fields.email = value;
    else if (key === 'ORG' && !fields.company) fields.company = value;
    else if (key === 'URL' && !fields.website) fields.website = value;
    else if (key === 'NOTE' && !fields.note) fields.note = value;
  }
  const draft = draftFromPartial(fields);
  if (!draft.name && !draft.email && !draft.phone) return null;
  return draft;
}

function looksLikeUriScheme(raw: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(raw.trim());
}

/**
 * Strict QR → contact parser. Never invents name/phone from free text.
 */
export function parseQrPayload(rawInput: string): QrParseResult {
  const raw = rawInput.trim();
  if (!raw) return { kind: 'unknown', raw: '' };

  // Prefer stripped vCard so PHOTO-heavy codes still yield FN/EMAIL/TEL.
  const preparedVcard = prepareVCardText(raw);
  const vcardSource = preparedVcard ?? raw;
  if (vcardSource.length <= MAX_QR_PAYLOAD_CHARS) {
    const vcard = parseVCard(vcardSource);
    if (vcard) return { kind: 'contact', draft: vcard };
  }

  if (raw.length > MAX_QR_PAYLOAD_CHARS) {
    return { kind: 'unknown', raw: raw.slice(0, 2000) };
  }

  const json = parseCardflowJson(raw);
  if (json) return { kind: 'contact', draft: json };

  const mecard = parseMecard(raw);
  if (mecard) return { kind: 'contact', draft: mecard };

  if (looksLikeUriScheme(raw)) {
    if (/^mailto:/i.test(raw)) {
      const email = raw.replace(/^mailto:/i, '').split('?')[0]!.trim();
      if (email) {
        return {
          kind: 'contact',
          draft: draftFromPartial({ name: email.split('@')[0] || email, email }),
        };
      }
    }
    if (/^tel:/i.test(raw)) {
      const phone = raw.replace(/^tel:/i, '').split('?')[0]!.trim();
      if (phone) {
        return {
          kind: 'contact',
          draft: draftFromPartial({ name: phone, phone }),
        };
      }
    }
    return { kind: 'url', url: raw };
  }

  return { kind: 'unknown', raw };
}

/** Stage a QR-derived draft for `/review?source=qr` (avoids huge route params). */
export async function stageQrDraft(draft: Draft): Promise<void> {
  memoryDraft = draft;
  reviewSessionApplied = false;
  await AsyncStorage.setItem(QR_DRAFT_KEY, JSON.stringify(draft));
}

/**
 * Read staged draft for Review. Keeps memory + storage until `clearQrDraft`
 * (call after successful save or when abandoning Review) so Strict Mode remounts
 * do not lose the payload.
 */
export async function readQrDraft(): Promise<Draft | null> {
  if (memoryDraft) return memoryDraft;
  try {
    const stored = await AsyncStorage.getItem(QR_DRAFT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<Draft>;
    const draft = draftFromPartial(parsed);
    memoryDraft = draft;
    return draft;
  } catch {
    return null;
  }
}

/** True after Review has applied the current staged draft (module-level). */
export function isQrDraftAppliedInReview(): boolean {
  return reviewSessionApplied;
}

export function markQrDraftAppliedInReview(): void {
  reviewSessionApplied = true;
}

/** Clear staged QR draft (call after Review save or abandon). */
export async function clearQrDraft(): Promise<void> {
  memoryDraft = null;
  reviewSessionApplied = false;
  try {
    await AsyncStorage.removeItem(QR_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function profileHasShareableFields(profile: Profile): boolean {
  // Must match parseVCard import rules — need name, email, phone, or website (FN derived).
  return Boolean(
    profile.name.trim() ||
      profile.email.trim() ||
      profile.phone.trim() ||
      profile.website.trim()
  );
}
