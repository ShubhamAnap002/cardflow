import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Contact } from '../lib/storage';
import {
  ENERTECH_SOURCE,
  buildEnerTechLeadPayload,
  mapLeadLevelToPriorityAndScore,
  normalizePhoneNumber,
  splitPhoneNumbers,
  queuePendingCrmSync,
  getPendingCrmSyncList,
  removePendingCrmSync,
} from '../lib/crm';

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

describe('CRM Integration - EnerTech Engage API', () => {
  beforeEach(() => {
    memory.clear();
  });

  it('normalizes phone numbers with country code 91 and no + sign', () => {
    // Standard +91 stripped to 91
    expect(normalizePhoneNumber('+919999999999')).toBe('919999999999');
    expect(normalizePhoneNumber('+91 98765 43210')).toBe('919876543210');
    // 10-digit Indian mobile numbers auto-prefixed with 91
    expect(normalizePhoneNumber('9876543210')).toBe('919876543210');
    expect(normalizePhoneNumber('8888888888')).toBe('918888888888');
    // 11-digit starting with 0
    expect(normalizePhoneNumber('09876543210')).toBe('919876543210');
    // Labels like Mob:, Tel:
    expect(normalizePhoneNumber('Mob: +91 98765 43210')).toBe('919876543210');
    // International
    expect(normalizePhoneNumber('+1 (415) 555-2671')).toBe('14155552671');
  });

  it('splits multiple phone numbers and handles cards with two mobiles', () => {
    const list = splitPhoneNumbers('+91 98765 43210 / 9123456789');
    expect(list).toEqual(['919876543210', '919123456789']);

    const listComma = splitPhoneNumbers('9876543210, 8888888888');
    expect(listComma).toEqual(['919876543210', '918888888888']);
  });

  it('maps lead levels to priority and score correctly', () => {
    expect(mapLeadLevelToPriorityAndScore('Hot')).toEqual({ priority: 'High', score: 90 });
    expect(mapLeadLevelToPriorityAndScore('Warm')).toEqual({ priority: 'Medium', score: 65 });
    expect(mapLeadLevelToPriorityAndScore('Cold')).toEqual({ priority: 'Low', score: 35 });
    expect(mapLeadLevelToPriorityAndScore('Platinum')).toEqual({ priority: 'High', score: 90 });
    expect(mapLeadLevelToPriorityAndScore('Gold')).toEqual({ priority: 'Medium', score: 65 });
  });

  it('builds a valid EnerTech lead payload with source EXPO and single mobile with 91 (no +)', () => {
    const contact: Contact = {
      id: 'c_test_1',
      name: 'Vismaya P',
      title: 'Sales Manager',
      company: 'APEE APEE INFRATECH (INDIA) PRIVATE',
      email: 'sales2@apeeonline.com',
      // Multiple numbers in primary phone field
      phone: '+918121007626 / +918121002534',
      address: 'Second Floor, RS Tower, Pune',
      leadType: 'Domestic',
      leadLevel: 'Platinum',
      scope: 'Bulk',
      phone2: '+918121009999',
      email2: 'sales-support@apeeonline.com',
      remark: 'Interested in 5KW solar panels.',
      products: ['5 KW Panel', 'Solar battery'],
      cardUri: 'https://cdn.example.com/front.jpg',
      cardUriBack: 'https://cdn.example.com/back.jpg',
      createdAt: Date.now(),
    };

    const payload = buildEnerTechLeadPayload(contact);

    // Verify source is EXPO
    expect(payload.source).toBe(ENERTECH_SOURCE);
    expect(payload.source).toBe('EXPO');

    // Verify phone is STRICTLY ONE mobile number, with country code 91, NO '+'
    expect(payload.phone).toBe('918121007626');
    expect(payload.phone).not.toContain('+');
    expect(payload.phone).not.toContain('/');

    // Verify core fields
    expect(payload.name).toBe('Vismaya P');
    expect(payload.company).toBe('APEE APEE INFRATECH (INDIA) PRIVATE');
    expect(payload.email).toBe('sales2@apeeonline.com');
    expect(payload.location).toBe('Second Floor, RS Tower, Pune');

    // Verify priority and score
    expect(payload.priority).toBe('High');
    expect(payload.score).toBe(90);

    // Verify requirement
    expect(payload.requirement).toBe('[Scope: Bulk] 5 KW Panel, Solar battery');

    // Verify notes contain source, remark, alt contacts (second numbers without +), and card URLs
    expect(payload.notes).toContain('[Lead Source: EXPO]');
    expect(payload.notes).toContain('Remark: Interested in 5KW solar panels.');
    expect(payload.notes).toContain('Alt Phone: 918121002534, 918121009999');
    expect(payload.notes).toContain('Alt Email: sales-support@apeeonline.com');
    expect(payload.notes).toContain('Card Front: https://cdn.example.com/front.jpg');
    expect(payload.notes).toContain('Card Back: https://cdn.example.com/back.jpg');

    // Verify tags: EXPO must be the first tag
    expect(payload.tags?.[0]).toBe('EXPO');
    expect(payload.tags).toContain('Domestic');
    expect(payload.tags).toContain('Platinum');
    expect(payload.tags).toContain('Scope: Bulk');
    expect(payload.tags).toContain('5 KW Panel');
    expect(payload.tags).toContain('Solar battery');
  });

  it('handles offline queueing and removal', async () => {
    await queuePendingCrmSync('c_lead_123');
    let list = await getPendingCrmSyncList();
    expect(list).toEqual(['c_lead_123']);

    // Duplicate queue calls do not duplicate ID
    await queuePendingCrmSync('c_lead_123');
    list = await getPendingCrmSyncList();
    expect(list).toEqual(['c_lead_123']);

    await queuePendingCrmSync('c_lead_456');
    list = await getPendingCrmSyncList();
    expect(list).toEqual(['c_lead_123', 'c_lead_456']);

    await removePendingCrmSync('c_lead_123');
    list = await getPendingCrmSyncList();
    expect(list).toEqual(['c_lead_456']);
  });
});
