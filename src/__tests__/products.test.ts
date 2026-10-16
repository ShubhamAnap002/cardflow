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
  addProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  addCategory,
  deleteCategory,
  listCategories,
} from '../lib/storage';

describe('Product & Category Storage', () => {
  beforeEach(() => {
    memory.clear();
  });

  it('starts with default energy & power categories and products', async () => {
    const products = await listProducts();
    expect(products.length).toBeGreaterThanOrEqual(6);
    expect(products.map((p) => p.name)).toContain('Solar Inverters & PCUs');
    expect(products.map((p) => p.name)).toContain('Uninterruptible Power Supplies (UPS)');

    const categories = await listCategories();
    expect(categories).toContain('Solar Inverters & PCUs');
    expect(categories).toContain('Energy Storage Systems (BESS)');
  });

  it('adds and lists products dynamically without dummy data', async () => {
    const initial = await listProducts();
    const p1 = await addProduct('Custom Inverter 500W', 'Inverters');
    expect(p1.name).toBe('Custom Inverter 500W');
    expect(p1.category).toBe('Inverters');
    expect(p1.id).toBeTruthy();

    const products = await listProducts();
    expect(products).toHaveLength(initial.length + 1);
    expect(products[0].name).toBe('Custom Inverter 500W');

    // Automatically tracks category
    const categories = await listCategories();
    expect(categories).toContain('Inverters');
  });

  it('updates and deletes products', async () => {
    const initialProds = await listProducts();
    const p = await addProduct('Solar Battery 100Ah', 'Batteries');
    await updateProduct(p.id, { name: 'Solar Battery 150Ah' });

    let products = await listProducts();
    expect(products[0].name).toBe('Solar Battery 150Ah');

    await deleteProduct(p.id);
    products = await listProducts();
    expect(products).toHaveLength(initialProds.length);
  });

  it('manages categories cleanly without duplicates', async () => {
    const initialCats = await listCategories();
    await addCategory('Solar Testing');
    await addCategory('Solar Testing'); // Duplicate
    await addCategory('Hardware Testing');

    let cats = await listCategories();
    expect(cats).toContain('Solar Testing');
    expect(cats).toContain('Hardware Testing');
    expect(cats).toHaveLength(initialCats.length + 2);

    await deleteCategory('Solar Testing');
    cats = await listCategories();
    expect(cats).not.toContain('Solar Testing');
  });
});
