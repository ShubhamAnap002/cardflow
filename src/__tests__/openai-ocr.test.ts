import { describe, expect, it } from 'vitest';
import { getOpenAiApiKey, isOpenAiConfigured } from '../lib/openai-ocr';
import { draftFromOcr } from '../lib/ocr-fields';

describe('OpenAI OCR Configuration & Mapping', () => {
  it('detects when OpenAI key is not configured or empty', () => {
    // If empty or default string
    const key = getOpenAiApiKey();
    if (!key || !key.startsWith('sk-')) {
      expect(isOpenAiConfigured()).toBe(false);
    }
  });

  it('draftFromOcr correctly maps extra fields from OpenAI scan', () => {
    const fields = {
      name: 'Rohan Deshmukh',
      company: 'EnerTech Solar Pvt Ltd',
      title: 'Managing Director',
      phone: '919822012345',
      email: 'rohan@enertech.in',
      website: 'https://enertech.in',
      address: 'Plot 45, MIDC, Pune',
      note: '',
    };

    const rawLines = [
      'EnerTech Solar Pvt Ltd',
      'Rohan Deshmukh',
      'Managing Director',
      '+91 98220 12345',
      'rohan@enertech.in',
      'Solar Inverter, Battery',
    ];

    const extra = {
      phone2: '919822099999',
      email2: 'info@enertech.in',
      leadType: 'Domestic' as const,
      scope: 'Bulk' as const,
      products: ['Solar Inverter', 'Battery', 'Solar Hybrid UPS'],
    };

    const draft = draftFromOcr(fields, rawLines, extra);

    expect(draft.name).toBe('Rohan Deshmukh');
    expect(draft.company).toBe('EnerTech Solar Pvt Ltd');
    expect(draft.phone).toBe('919822012345');
    expect(draft.phone2).toBe('919822099999');
    expect(draft.email2).toBe('info@enertech.in');
    expect(draft.leadType).toBe('Domestic');
    expect(draft.scope).toBe('Bulk');
    expect(draft.products).toEqual(['Solar Inverter', 'Battery', 'Solar Hybrid UPS']);
    expect(draft.rawOcrLines).toContain('Solar Inverter, Battery');
  });
});
