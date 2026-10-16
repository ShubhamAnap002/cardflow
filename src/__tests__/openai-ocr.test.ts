import { describe, expect, it } from 'vitest';
import {
  getOpenAiApiKey,
  isOpenAiConfigured,
  mapOpenAiCardData,
  parseOpenAiCardJson,
} from '../lib/openai-ocr';
import { draftFromOcr } from '../lib/ocr-fields';

describe('OpenAI OCR Configuration & Mapping', () => {
  it('detects when OpenAI key is configured or empty', () => {
    const key = getOpenAiApiKey();
    if (!key || !key.startsWith('sk-')) {
      expect(isOpenAiConfigured()).toBe(false);
    } else {
      expect(isOpenAiConfigured()).toBe(true);
    }
  });

  it('safely parses JSON with markdown code fences and whitespace', () => {
    const markdownResponse = `
    \`\`\`json
    {
      "name": "Sarah Connor",
      "company": "Cyberdyne Systems",
      "title": "Lead Engineer",
      "phone": "+91 98765 43210",
      "email": "sarah@cyberdyne.com"
    }
    \`\`\`
    `;
    const parsed = parseOpenAiCardJson(markdownResponse);
    expect(parsed.name).toBe('Sarah Connor');
    expect(parsed.company).toBe('Cyberdyne Systems');
  });

  it('maps synonym keys into standardized CardFlow fields', () => {
    const synonymPayload = {
      fullName: 'Vikramaditya Sharma',
      organization: 'SolarEdge Technologies',
      designation: 'Chief Technology Officer',
      mobile: '+91 99887 76655',
      secondaryPhone: '020-27481234',
      emailAddress: 'vikram@solaredge.in',
      altEmail: 'support@solaredge.in',
      web: 'https://solaredge.in',
      location: 'Hinjawadi Phase 1, Pune',
      leadType: 'International Exports',
      scope: 'Small Retailer',
      services: ['Solar Inverters', 'Energy Storage', 'Lithium Batteries'],
    };

    const result = mapOpenAiCardData(synonymPayload);

    expect(result.fields.name).toBe('Vikramaditya Sharma');
    expect(result.fields.company).toBe('SolarEdge Technologies');
    expect(result.fields.title).toBe('Chief Technology Officer');
    expect(result.fields.phone).toBe('919988776655');
    expect(result.fields.email).toBe('vikram@solaredge.in');
    expect(result.fields.website).toBe('https://solaredge.in');
    expect(result.fields.address).toBe('Hinjawadi Phase 1, Pune');
    expect(result.extra?.phone2).toBe('02027481234');
    expect(result.extra?.email2).toBe('support@solaredge.in');
    expect(result.extra?.leadType).toBe('International');
    expect(result.extra?.scope).toBe('Small');
    expect(result.extra?.products).toEqual([
      'Solar Inverters',
      'Energy Storage',
      'Lithium Batteries',
    ]);
    // Verifies tap-to-fill rawLines includes extracted lines
    expect(result.rawLines).toContain('Vikramaditya Sharma');
    expect(result.rawLines).toContain('SolarEdge Technologies');
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
