import {
  looksLikeAddress,
  looksLikeCompany,
  looksLikePersonName,
  looksLikePhone,
  looksLikeTitle,
  looksLikeWebsite,
} from '@/lib/card-text-parse';
import type { Draft } from '@/lib/contact-draft';
import { EMPTY_DRAFT } from '@/lib/contact-draft';
import type { OcrFields } from '@/lib/ocr-fields';

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function uniqueParts(values: string[], splitOn: RegExp): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    for (const part of value.split(splitOn)) {
      const item = clean(part);
      if (!item) continue;
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function pickMatch(front: string, back: string, ok: (value: string) => boolean): { value: string; rejected: string[] } {
  const a = clean(front);
  const b = clean(back);
  const aOk = Boolean(a) && ok(a);
  const bOk = Boolean(b) && ok(b);
  if (aOk && bOk) return { value: a, rejected: a.toLowerCase() === b.toLowerCase() ? [] : [b] };
  if (bOk) return { value: b, rejected: a && a.toLowerCase() !== b.toLowerCase() ? [a] : [] };
  if (aOk) return { value: a, rejected: [] };
  return { value: '', rejected: [a, b].filter(Boolean) };
}

/**
 * Map front + back by field rules. A wrong front value does not win.
 * Lines that match nothing are kept in note.
 */
export function mergeCardFields(front: Draft, back: OcrFields): Draft {
  const emails = uniqueParts([front.email, back.email], /,/);
  const phones = uniqueParts([front.phone, back.phone], /,/).filter((p) => looksLikePhone(p) || p.replace(/\D/g, '').length >= 8);

  const name = pickMatch(front.name, back.name, looksLikePersonName);
  const title = pickMatch(front.title, back.title, looksLikeTitle);
  const company = pickMatch(front.company, back.company, looksLikeCompany);
  const website = pickMatch(front.website, back.website, looksLikeWebsite);
  const address = pickMatch(front.address, back.address, looksLikeAddress);

  let nameValue = name.value;
  let titleValue = title.value;
  let companyValue = company.value;
  let websiteValue = website.value;
  let addressValue = address.value;
  const leftovers = [
    ...name.rejected,
    ...title.rejected,
    ...company.rejected,
    ...website.rejected,
    ...address.rejected,
  ];
  const still: string[] = [];
  for (const line of leftovers) {
    if (!nameValue && looksLikePersonName(line)) nameValue = line;
    else if (!titleValue && looksLikeTitle(line)) titleValue = line;
    else if (!companyValue && looksLikeCompany(line)) companyValue = line;
    else if (!websiteValue && looksLikeWebsite(line)) websiteValue = line;
    else if (!addressValue && looksLikeAddress(line)) addressValue = line;
    else still.push(line);
  }

  const note = uniqueParts([front.note, back.note, ...still], /\n/);

  return {
    ...EMPTY_DRAFT,
    name: nameValue,
    title: titleValue,
    company: companyValue,
    phone: phones.join(', '),
    email: emails.join(', '),
    website: websiteValue,
    address: addressValue,
    note: note.join('\n'),
    group: front.group,
  };
}

export function averageConfidence(a?: number, b?: number): number | undefined {
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  return Math.round((a + b) / 2);
}
