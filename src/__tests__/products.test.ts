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

  it('starts with empty products list by default', async () => {
    const products = await listProducts();
    expect(products).toEqual([]);
  });

  it('adds and lists products dynamically without dummy data', async () => {
    const p1 = await addProduct('Custom Inverter 500W', 'Inverters');
    expect(p1.name).toBe('Custom Inverter 500W');
    expect(p1.category).toBe('Inverters');
    expect(p1.id).toBeTruthy();

    const products = await listProducts();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Custom Inverter 500W');

    // Automatically tracks category
    const categories = await listCategories();
    expect(categories).toContain('Inverters');
  });

  it('updates and deletes products', async () => {
    const p = await addProduct('Solar Battery 100Ah', 'Batteries');
    await updateProduct(p.id, { name: 'Solar Battery 150Ah' });

    let products = await listProducts();
    expect(products[0].name).toBe('Solar Battery 150Ah');

    await deleteProduct(p.id);
    products = await listProducts();
    expect(products).toHaveLength(0);
  });

  it('manages categories cleanly without duplicates', async () => {
    await addCategory('Solar');
    await addCategory('Solar'); // Duplicate
    await addCategory('Hardware');

    let cats = await listCategories();
    expect(cats).toEqual(['Solar', 'Hardware']);

    await deleteCategory('Solar');
    cats = await listCategories();
    expect(cats).toEqual(['Hardware']);
  });
});
