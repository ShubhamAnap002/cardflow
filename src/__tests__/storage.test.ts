import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      if (key === 'cardflow.forceFail') {
        throw new Error('disk full');
      }
      memory.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      memory.delete(key);
    }),
  },
}));

import {
  addContact,
  listContacts,
  listGroups,
  saveProfile,
  DEFAULT_PROFILE,
} from '../lib/storage';

describe('storage harden', () => {
  beforeEach(() => {
    memory.clear();
  });

  it('listContacts returns [] for corrupt non-array JSON', async () => {
    memory.set('cardflow.contacts.v1', JSON.stringify({ not: 'an array' }));
    expect(await listContacts()).toEqual([]);
  });

  it('listGroups returns [] for corrupt non-array JSON', async () => {
    memory.set('cardflow.groups.v1', JSON.stringify('oops'));
    expect(await listGroups()).toEqual([]);
  });

  it('round-trips a contact', async () => {
    const c = await addContact({
      name: 'Ada',
      title: '',
      company: '',
      email: 'a@x.com',
      phone: '',
    });
    const list = await listContacts();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(c.id);
    expect(list[0]?.name).toBe('Ada');
  });

  it('saveProfile throws when AsyncStorage fails', async () => {
    const setItem = (await import('@react-native-async-storage/async-storage')).default
      .setItem as ReturnType<typeof vi.fn>;
    setItem.mockImplementationOnce(async () => {
      throw new Error('disk full');
    });
    await expect(saveProfile({ ...DEFAULT_PROFILE, name: 'X' })).rejects.toThrow(
      /Could not save data/
    );
  });
});
