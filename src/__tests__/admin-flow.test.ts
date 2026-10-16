import { describe, expect, it, beforeEach, vi } from 'vitest';

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
    clear: vi.fn(async () => {
      memory.clear();
    }),
  },
}));

import {
  addProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  addCategory,
  listCategories,
  deleteCategory,
} from '../lib/storage';
import { buildEnerTechLeadPayload } from '../lib/crm';
import type { Contact } from '../lib/storage';

describe('Admin Product & Category Flow Integration Test', () => {
  beforeEach(async () => {
    memory.clear();
  });

  it('starts with default energy and power categories and products', async () => {
    const products = await listProducts();
    const categories = await listCategories();
    expect(products.length).toBeGreaterThanOrEqual(6);
    expect(categories).toContain('Solar Inverters & PCUs');
    expect(categories).toContain('Uninterruptible Power Supplies (UPS)');
  });

  it('allows adding categories in Admin section', async () => {
    const initialCats = await listCategories();
    await addCategory('Solar Panels');
    await addCategory('Inverters & UPS');
    await addCategory('Industrial Batteries');

    const categories = await listCategories();
    expect(categories).toContain('Solar Panels');
    expect(categories).toContain('Inverters & UPS');
    expect(categories).toContain('Industrial Batteries');

    // Case-insensitive dedup check
    await addCategory('solar panels');
    const deduped = await listCategories();
    expect(deduped).toHaveLength(initialCats.length + 3);
  });

  it('allows adding products linked to categories in Admin', async () => {
    const initialProds = await listProducts();
    await addCategory('Solar Panels');
    const p1 = await addProduct('Mono PERC 550W', 'Solar Panels', {
      description: 'High efficiency bifacial solar panel',
    });
    const p2 = await addProduct('EnerTech 10kVA Online UPS', 'Inverters & UPS', {
      description: 'Three-phase industrial backup system',
    });

    const products = await listProducts();
    expect(products).toHaveLength(initialProds.length + 2);
    expect(products.map((p) => p.name)).toContain('EnerTech 10kVA Online UPS');
    expect(products.map((p) => p.name)).toContain('Mono PERC 550W');

    // Automatically added category if not present
    const categories = await listCategories();
    expect(categories).toContain('Solar Panels');
    expect(categories).toContain('Inverters & UPS');
  });

  it('allows editing and deleting products and categories', async () => {
    const initialProds = await listProducts();
    const p = await addProduct('Battery Bank 48V', 'Storage');
    expect(p.category).toBe('Storage');

    await updateProduct(p.id, { name: 'Lithium Battery 48V 100Ah', description: 'LiFePO4 battery' });
    let products = await listProducts();
    const found = products.find((prod) => prod.id === p.id);
    expect(found?.name).toBe('Lithium Battery 48V 100Ah');
    expect(found?.description).toBe('LiFePO4 battery');

    await deleteProduct(p.id);
    products = await listProducts();
    expect(products).toHaveLength(initialProds.length);

    await deleteCategory('Storage');
    const categories = await listCategories();
    expect(categories).not.toContain('Storage');
  });

  it('tags selected products on a lead and formats properly for EnerTech Engage CRM', () => {
    const sampleLead: Contact = {
      id: 'lead_expo_test',
      name: 'Rajesh Sharma',
      title: 'Procurement Head',
      company: 'Tata Power Solar Systems',
      phone: '+919876543210',
      email: 'rajesh.sharma@tatapower.com',
      createdAt: Date.now(),
      leadLevel: 'Platinum',
      leadType: 'Domestic',
      scope: 'Bulk',
      remark: 'Looking for 500 units by Q4. Follow up on Tuesday.',
      products: ['Mono PERC 550W', 'EnerTech 10kVA Online UPS'],
    };

    const payload = buildEnerTechLeadPayload(sampleLead);

    // Verify CRM payload
    expect(payload.source).toBe('EXPO');
    expect(payload.phone).toBe('919876543210');
    expect(payload.score).toBe(90);
    expect(payload.requirement).toBe('[Scope: Bulk] Mono PERC 550W, EnerTech 10kVA Online UPS');
    expect(payload.tags).toEqual(
      expect.arrayContaining(['Platinum', 'Domestic', 'Mono PERC 550W', 'EnerTech 10kVA Online UPS'])
    );
    expect(payload.notes).toContain('Product Interest: Mono PERC 550W, EnerTech 10kVA Online UPS');
    expect(payload.notes).toContain('Lead Level: Platinum');
    expect(payload.notes).toContain('Procurement Head');
  });
});
