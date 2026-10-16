import { describe, expect, it } from 'vitest';

import { validate, splitEmails, toContact, EMPTY_DRAFT } from '../lib/contact-draft';
import { averageConfidence, mergeCardFields } from '../lib/merge-card';
import {
  clampConfidence,
  isRetryableOcrStatus,
  normalizeOcrEmail,
  toDraftFields,
} from '../lib/ocr-fields';
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '../lib/legal-content';
import { getPrivacyUrl } from '../lib/privacy-url';
import {
  isLocalOcrStrongEnough,
  parseBusinessCardText,
} from '../lib/card-text-parse';

describe('contact-draft validation', () => {
  it('requires a name', () => {
    const errors = validate({ ...EMPTY_DRAFT, name: '' });
    expect(errors.name).toBeTruthy();
  });

  it('accepts comma-separated emails', () => {
    const errors = validate({
      ...EMPTY_DRAFT,
      name: 'Ada',
      email: 'a@x.com, b@y.org',
    });
    expect(errors.email).toBeUndefined();
  });

  it('rejects a bad email in a list', () => {
    const errors = validate({
      ...EMPTY_DRAFT,
      name: 'Ada',
      email: 'ok@x.com, not-an-email',
    });
    expect(errors.email).toBeTruthy();
  });

  it('normalizes emails on toContact', () => {
    const contact = toContact({
      ...EMPTY_DRAFT,
      name: ' Ada Lovelace ',
      email: ' a@x.com , b@y.org ',
    });
    expect(contact.name).toBe('Ada Lovelace');
    expect(contact.email).toBe('a@x.com, b@y.org');
  });

  it('splitEmails drops empties', () => {
    expect(splitEmails(' a@x.com , , b@y.org ')).toEqual(['a@x.com', 'b@y.org']);
  });

  it('preserves speech transcript and voice remark in toContact', () => {
    const contact = toContact({
      ...EMPTY_DRAFT,
      name: 'Michael Scott',
      remark: 'Spoke with CEO about annual contract renewal',
      voiceTranscript: 'Spoke with CEO about annual contract renewal',
      audioUri: 'blob:http://localhost/test-audio',
    });
    expect(contact.remark).toBe('Spoke with CEO about annual contract renewal');
    expect(contact.voiceTranscript).toBe('Spoke with CEO about annual contract renewal');
    expect(contact.audioUri).toBe('blob:http://localhost/test-audio');
  });
});

describe('merge-card', () => {
  it('keeps a real front name and fills contact fields from back', () => {
    const merged = mergeCardFields(
      { ...EMPTY_DRAFT, name: 'Ada Lovelace', email: '' },
      { ...toDraftFields({}), name: 'Back Name', email: 'b@x.com', phone: '1234567890' }
    );
    expect(merged.name).toBe('Ada Lovelace');
    expect(merged.email).toBe('b@x.com');
    expect(merged.phone).toBe('1234567890');
    expect(merged.note).toContain('Back Name');
  });

  it('replaces a company sitting in the name field when the back has a person', () => {
    const merged = mergeCardFields(
      { ...EMPTY_DRAFT, name: 'Acme Pvt Ltd' },
      { ...toDraftFields({}), name: 'Riya Shah' }
    );
    expect(merged.name).toBe('Riya Shah');
    expect(merged.company).toBe('Acme Pvt Ltd');
  });

  it('merges unique emails from both sides', () => {
    const merged = mergeCardFields(
      { ...EMPTY_DRAFT, email: 'a@x.com' },
      { ...toDraftFields({}), email: 'a@x.com, b@y.org' }
    );
    expect(merged.email).toBe('a@x.com, b@y.org');
  });

  it('averages confidence', () => {
    expect(averageConfidence(80, 100)).toBe(90);
    expect(averageConfidence(undefined, 70)).toBe(70);
  });
});

describe('ocr-fields', () => {
  it('normalizes email arrays and csv', () => {
    expect(normalizeOcrEmail(['a@x.com', ' b@y.org '])).toBe('a@x.com, b@y.org');
    expect(normalizeOcrEmail('a@x.com;b@y.org')).toBe('a@x.com, b@y.org');
  });

  it('clamps confidence', () => {
    expect(clampConfidence(150)).toBe(99);
    expect(clampConfidence(-3)).toBe(0);
    expect(clampConfidence('x')).toBe(70);
  });

  it('marks retryable statuses', () => {
    expect(isRetryableOcrStatus(503)).toBe(true);
    expect(isRetryableOcrStatus(429)).toBe(true);
    expect(isRetryableOcrStatus(400)).toBe(false);
  });
});

describe('card-text-parse', () => {
  it('extracts email phone and name from plain OCR text', () => {
    const fields = parseBusinessCardText(
      'Ada Lovelace\nEngineer\nAda Labs Inc\nada@labs.com\n+1 415 555 0100\nwww.adalabs.com'
    );
    expect(fields.email).toContain('ada@labs.com');
    expect(fields.phone.replace(/\D/g, '').length).toBeGreaterThanOrEqual(8);
    expect(fields.name).toBe('Ada Lovelace');
    expect(fields.title.toLowerCase()).toContain('engineer');
    expect(fields.company.toLowerCase()).toContain('labs');
    expect(fields.website.toLowerCase()).toContain('adalabs');
  });

  it('puts unmatched lines in note instead of guessing a name', () => {
    const fields = parseBusinessCardText('We build the future\nScan me');
    expect(fields.name).toBe('');
    expect(fields.note).toContain('We build the future');
    expect(fields.note).toContain('Scan me');
  });

  it('accepts strong local OCR and rejects weak', () => {
    expect(
      isLocalOcrStrongEnough(
        { ...EMPTY_DRAFT, name: 'Ada Lovelace', email: 'a@x.com', phone: '', title: '', company: '', website: '', address: '', note: '' },
        80
      )
    ).toBe(true);
    expect(
      isLocalOcrStrongEnough(
        { ...EMPTY_DRAFT, name: 'Ada', email: 'a@x.com', phone: '', title: '', company: '', website: '', address: '', note: '' },
        80
      )
    ).toBe(false);
  });
});

describe('legal + privacy url', () => {
  it('ships non-empty privacy and terms sections', () => {
    expect(PRIVACY_SECTIONS.length).toBeGreaterThanOrEqual(10);
    expect(TERMS_SECTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('defaults to hosted shy-fog privacy url', () => {
    expect(getPrivacyUrl()).toContain('shy-fog');
  });

  it('documents rewarded ads in advertising section', () => {
    const ads = PRIVACY_SECTIONS.find((s) => s.title.startsWith('6.'));
    expect(ads?.body.toLowerCase()).toContain('rewarded');
  });
});
