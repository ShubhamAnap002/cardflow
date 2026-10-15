import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      memory.delete(key);
    }),
  },
}));

import {
  canUseLimitedQr,
  clearQrDraft,
  contactNameFromUrl,
  draftFromWebsiteUrl,
  encodeAsVCard,
  encodeProfileAsVCard,
  isQrDraftAppliedInReview,
  markQrDraftAppliedInReview,
  MAX_VCARD_NOTE_CHARS,
  parseQrPayload,
  profileHasShareableFields,
  readQrDraft,
  resolveQrDetailMode,
  stageQrDraft,
} from '../lib/qr-card';
import { EMPTY_DRAFT } from '../lib/contact-draft';

describe('qr-card encode/parse', () => {
  it('round-trips a profile through vCard', () => {
    const vcard = encodeProfileAsVCard({
      name: 'Ada Lovelace',
      title: 'Engineer',
      company: 'Analytical Engines',
      email: 'ada@example.com',
      phone: '+1 555 0100',
      website: 'https://ada.dev',
    });
    const result = parseQrPayload(vcard);
    expect(result.kind).toBe('contact');
    if (result.kind !== 'contact') return;
    expect(result.draft.name).toBe('Ada Lovelace');
    expect(result.draft.title).toBe('Engineer');
    expect(result.draft.company).toBe('Analytical Engines');
    expect(result.draft.email).toBe('ada@example.com');
    expect(result.draft.phone).toBe('+1 555 0100');
    expect(result.draft.website).toBe('https://ada.dev');
  });

  it('parses CardFlow JSON v1', () => {
    const raw = JSON.stringify({
      v: 1,
      app: 'cardflow',
      name: 'Grace Hopper',
      company: 'USN',
      email: 'grace@example.com',
    });
    const result = parseQrPayload(raw);
    expect(result.kind).toBe('contact');
    if (result.kind !== 'contact') return;
    expect(result.draft.name).toBe('Grace Hopper');
    expect(result.draft.company).toBe('USN');
    expect(result.draft.email).toBe('grace@example.com');
  });

  it('classifies https URLs without inventing contact fields', () => {
    const result = parseQrPayload('https://example.com/card');
    expect(result).toEqual({ kind: 'url', url: 'https://example.com/card' });
  });

  it('does not invent contacts from free text', () => {
    const result = parseQrPayload('hello world not a card');
    expect(result.kind).toBe('unknown');
  });

  it('rejects JSON with wrong version', () => {
    const result = parseQrPayload(JSON.stringify({ v: 2, name: 'X' }));
    expect(result.kind).toBe('unknown');
  });

  it('parses iOS-style item1.EMAIL / item1.TEL lines', () => {
    const raw = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Pat Lee',
      'item1.EMAIL;type=INTERNET:pat@example.com',
      'item1.TEL;type=CELL:+15550199',
      'END:VCARD',
    ].join('\n');
    const result = parseQrPayload(raw);
    expect(result.kind).toBe('contact');
    if (result.kind !== 'contact') return;
    expect(result.draft.name).toBe('Pat Lee');
    expect(result.draft.email).toBe('pat@example.com');
    expect(result.draft.phone).toBe('+15550199');
  });

  it('turns mailto: into a contact draft', () => {
    const result = parseQrPayload('mailto:ada@example.com');
    expect(result.kind).toBe('contact');
    if (result.kind !== 'contact') return;
    expect(result.draft.email).toBe('ada@example.com');
  });

  it('round-trips website via encodeAsVCard', () => {
    const raw = encodeAsVCard({
      name: 'Site Owner',
      email: 'o@example.com',
      website: 'https://example.com',
    });
    const result = parseQrPayload(raw);
    expect(result.kind).toBe('contact');
    if (result.kind !== 'contact') return;
    expect(result.draft.website).toBe('https://example.com');
  });

  it('requires name, email, or phone for a shareable profile QR', () => {
    expect(
      profileHasShareableFields({
        name: '',
        title: 'CEO',
        company: 'Acme',
        email: '',
        phone: '',
        website: '',
      })
    ).toBe(false);
    expect(
      profileHasShareableFields({
        name: '',
        title: '',
        company: '',
        email: 'a@b.com',
        phone: '',
        website: '',
      })
    ).toBe(true);
  });

  it('strips PHOTO and still parses FN/EMAIL', () => {
    const photo = 'A'.repeat(9000);
    const raw = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Big Photo',
      'EMAIL:big@example.com',
      `PHOTO;ENCODING=b;TYPE=JPEG:${photo}`,
      'END:VCARD',
    ].join('\n');
    const result = parseQrPayload(raw);
    expect(result.kind).toBe('contact');
    if (result.kind !== 'contact') return;
    expect(result.draft.name).toBe('Big Photo');
    expect(result.draft.email).toBe('big@example.com');
  });

  it('decodes quoted-printable FN', () => {
    const raw = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9',
      'EMAIL:jose@example.com',
      'END:VCARD',
    ].join('\n');
    const result = parseQrPayload(raw);
    expect(result.kind).toBe('contact');
    if (result.kind !== 'contact') return;
    expect(result.draft.name).toBe('José');
  });

  it('parses MECARD and tel:', () => {
    const mecard = parseQrPayload('MECARD:N:Sam Lee;TEL:+15551212;EMAIL:sam@example.com;;');
    expect(mecard.kind).toBe('contact');
    if (mecard.kind === 'contact') {
      expect(mecard.draft.name).toBe('Sam Lee');
      expect(mecard.draft.phone).toBe('+15551212');
      expect(mecard.draft.email).toBe('sam@example.com');
    }
    const tel = parseQrPayload('tel:+15559876');
    expect(tel.kind).toBe('contact');
    if (tel.kind === 'contact') expect(tel.draft.phone).toBe('+15559876');
  });

  it('names URL contacts from path, keeps full website', () => {
    expect(contactNameFromUrl('https://qrco.de/gwt-1')).toBe('gwt 1');
    const draft = draftFromWebsiteUrl('https://qrco.de/gwt-1');
    expect(draft.website).toBe('https://qrco.de/gwt-1');
    expect(draft.name).toBe('gwt 1');
    expect(draft.note).toContain('https://qrco.de/gwt-1');
  });

  it('limited vCard keeps phone + website, omits email', () => {
    const raw = encodeAsVCard(
      {
        name: 'Ada',
        email: 'ada@example.com',
        phone: '+1555',
        title: 'Eng',
        website: 'https://ada.dev',
      },
      'limited'
    );
    expect(raw).not.toMatch(/EMAIL/);
    expect(raw).not.toMatch(/TITLE/);
    expect(raw).toMatch(/TEL/);
    expect(raw).toMatch(/URL:https:\/\/ada\.dev/);
    const parsed = parseQrPayload(raw);
    expect(parsed.kind).toBe('contact');
    if (parsed.kind === 'contact') {
      expect(parsed.draft.email).toBe('');
      expect(parsed.draft.phone).toBe('+1555');
      expect(parsed.draft.website).toBe('https://ada.dev');
    }
  });

  it('falls back to full when limited would drop email-only identity', () => {
    const raw = encodeAsVCard(
      {
        name: '',
        email: 'solo@example.com',
        phone: '',
        title: 'CEO',
      },
      'limited'
    );
    expect(raw).toMatch(/EMAIL/);
    expect(raw).toMatch(/TITLE/);
    expect(resolveQrDetailMode({ name: '', phone: '' }, 'limited')).toBe('full');
    expect(canUseLimitedQr({ name: '', phone: '' })).toBe(false);
  });

  it('derives FN from website when name is empty', () => {
    const raw = encodeAsVCard({
      name: '',
      website: 'https://qrco.de/gwt-1',
    });
    expect(raw).toMatch(/FN:gwt 1/);
    const parsed = parseQrPayload(raw);
    expect(parsed.kind).toBe('contact');
    if (parsed.kind === 'contact') {
      expect(parsed.draft.website).toBe('https://qrco.de/gwt-1');
      expect(parsed.draft.name).toBe('gwt 1');
    }
  });

  it('caps NOTE length in full vCard', () => {
    const long = 'x'.repeat(800);
    const raw = encodeAsVCard({ name: 'N', note: long }, 'full');
    const noteLine = raw.split('\n').find((l) => l.startsWith('NOTE:'));
    expect(noteLine).toBeTruthy();
    expect(noteLine!.length).toBeLessThanOrEqual(5 + MAX_VCARD_NOTE_CHARS + 20);
  });

  it('round-trips address in full vCard', () => {
    const raw = encodeAsVCard({
      name: 'Ada',
      address: '1 Analytical Way',
    });
    const parsed = parseQrPayload(raw);
    expect(parsed.kind).toBe('contact');
    if (parsed.kind === 'contact') {
      expect(parsed.draft.address).toContain('1 Analytical Way');
    }
  });

  it('treats website-only profile as shareable', () => {
    expect(
      profileHasShareableFields({
        name: '',
        title: '',
        company: '',
        email: '',
        phone: '',
        website: 'https://example.com',
      })
    ).toBe(true);
  });
});

describe('qr-card draft staging', () => {
  beforeEach(async () => {
    memory.clear();
    await clearQrDraft();
  });

  it('readQrDraft can be called twice before clear (remount-safe)', async () => {
    const draft = { ...EMPTY_DRAFT, name: 'Test', email: 't@example.com' };
    await stageQrDraft(draft);
    const first = await readQrDraft();
    const second = await readQrDraft();
    expect(first?.name).toBe('Test');
    expect(second?.name).toBe('Test');
    await clearQrDraft();
    expect(await readQrDraft()).toBeNull();
  });

  it('keeps draft after mark applied until clear (review remount)', async () => {
    await stageQrDraft({ ...EMPTY_DRAFT, name: 'Keep', phone: '+1' });
    expect(isQrDraftAppliedInReview()).toBe(false);
    const staged = await readQrDraft();
    markQrDraftAppliedInReview();
    expect(isQrDraftAppliedInReview()).toBe(true);
    expect((await readQrDraft())?.name).toBe('Keep');
    expect(staged?.name).toBe('Keep');
    await clearQrDraft();
    expect(isQrDraftAppliedInReview()).toBe(false);
    expect(await readQrDraft()).toBeNull();
  });
});
