import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IconName } from '@/components/icon';

const PROFILE_KEY = 'cardflow.profile.v1';
const CONTACTS_KEY = 'cardflow.contacts.v1';
const GROUPS_KEY = 'cardflow.groups.v1';
const SETTINGS_KEY = 'cardflow.settings.v1';
const PRODUCTS_KEY = 'cardflow.products.v1';
const CATEGORIES_KEY = 'cardflow.categories.v1';

export type Profile = {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  avatarUri?: string;
};

export type Contact = {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  group?: string;
  note?: string;
  favorite?: boolean;
  /** Local URI of the captured card image, when the contact came from a scan. */
  cardUri?: string;
  /** Optional back-side card image. */
  cardUriBack?: string;
  /** OCR confidence for scanned cards — drives the "needs review" badges. */
  confidence?: number;
  /** How the contact was added — drives list status chips. */
  source?: 'qr' | 'scan';
  createdAt: number;
  /** Lead type classification: Domestic or International */
  leadType?: 'Domestic' | 'International';
  /** Lead priority tier */
  leadLevel?: 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  /** Deal requirement scope: Bulk or Small */
  scope?: 'Bulk' | 'Small';
  /** Secondary phone number */
  phone2?: string;
  /** Secondary email address */
  email2?: string;
  /** Sales meeting remarks */
  remark?: string;
  /** Live speech-to-text transcript */
  voiceTranscript?: string;
  /** Local or remote URI to recorded voice remark */
  audioUri?: string;
  /** Products of interest */
  products?: string[];
  /** Associated ID in EnerTech Engage CRM */
  crmLeadId?: string;
  /** CRM synchronization status */
  crmSyncStatus?: 'synced' | 'pending' | 'failed';
  /** Last CRM error message if sync failed */
  crmSyncError?: string;
  /** Raw detected OCR text lines from business card */
  rawOcrLines?: string[];
};

export type Group = {
  id: string;
  name: string;
  subtitle: string;
  icon: IconName;
  tint: string;
  createdAt: number;
};

export type NewContact = Omit<Contact, 'id' | 'createdAt'>;

export type Settings = {
  /** Persist captured card photos with the contact. */
  saveCardImages: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  saveCardImages: true,
};

export const DEFAULT_PROFILE: Profile = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
};

const DAY = 86_400_000;

/** Legacy demo IDs — stripped once if still present from older installs. */
const DEMO_CONTACT_IDS = new Set([
  'c_marcus',
  'c_alex',
  'c_elena',
  'c_maya',
  'c_michael',
]);
const DEMO_GROUP_IDS = new Set(['g_tc', 'g_investors', 'g_enterprise', 'g_dinner']);
const DEMO_PROFILE_EMAIL = 'sarah@cardflow.app';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('Could not save data on this device.');
  }
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------- profile -------------------------------- */

export async function loadProfile(): Promise<Profile> {
  const stored = await readJson<Partial<Profile> | null>(PROFILE_KEY, null);
  if (!stored) return { ...DEFAULT_PROFILE };
  const merged = { ...DEFAULT_PROFILE, ...stored };
  // Drop the old demo profile if the user never customized it.
  if (merged.email === DEMO_PROFILE_EMAIL && merged.name === 'Sarah Jenkins') {
    await writeJson(PROFILE_KEY, DEFAULT_PROFILE);
    return { ...DEFAULT_PROFILE };
  }
  return merged;
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  await writeJson(PROFILE_KEY, profile);
  return profile;
}

/* ------------------------------- contacts ------------------------------- */

/** AsyncStorage is the single source of truth for contacts on this device. */
export async function listContacts(): Promise<Contact[]> {
  const stored = await readJson<Contact[] | null>(CONTACTS_KEY, null);
  if (!Array.isArray(stored)) return [];

  const cleaned = stored.filter((contact) => contact && !DEMO_CONTACT_IDS.has(contact.id));
  if (cleaned.length !== stored.length) {
    await writeJson(CONTACTS_KEY, cleaned);
  }
  return cleaned.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const contacts = await listContacts();
  return contacts.find((contact) => contact.id === id);
}

export async function addContact(input: NewContact): Promise<Contact> {
  const contacts = await listContacts();
  const contact: Contact = { ...input, id: newId('c'), createdAt: Date.now() };
  await writeJson(CONTACTS_KEY, [contact, ...contacts]);
  return contact;
}

export async function updateContact(id: string, patch: Partial<NewContact>): Promise<Contact[]> {
  const contacts = await listContacts();
  const next = contacts.map((contact) =>
    contact.id === id ? { ...contact, ...patch } : contact
  );
  await writeJson(CONTACTS_KEY, next);
  return next;
}

export async function deleteContact(id: string): Promise<Contact[]> {
  const contacts = await listContacts();
  const next = contacts.filter((contact) => contact.id !== id);
  await writeJson(CONTACTS_KEY, next);
  return next;
}

export async function toggleFavorite(id: string): Promise<Contact[]> {
  const contacts = await listContacts();
  const next = contacts.map((contact) =>
    contact.id === id ? { ...contact, favorite: !contact.favorite } : contact
  );
  await writeJson(CONTACTS_KEY, next);
  return next;
}

/* -------------------------------- groups -------------------------------- */

export async function listGroups(): Promise<Group[]> {
  const stored = await readJson<Group[] | null>(GROUPS_KEY, null);
  if (!Array.isArray(stored)) return [];

  const cleaned = stored.filter((group) => group && !DEMO_GROUP_IDS.has(group.id));
  if (cleaned.length !== stored.length) {
    await writeJson(GROUPS_KEY, cleaned);
  }
  return cleaned.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export async function addGroup(name: string, subtitle: string): Promise<Group> {
  const groups = await listGroups();
  const group: Group = {
    id: newId('g'),
    name,
    subtitle,
    icon: 'folder_special',
    tint: '#2563EB',
    createdAt: Date.now(),
  };
  await writeJson(GROUPS_KEY, [group, ...groups]);
  return group;
}

export async function deleteGroup(id: string): Promise<Group[]> {
  const groups = await listGroups();
  const next = groups.filter((group) => group.id !== id);
  await writeJson(GROUPS_KEY, next);
  return next;
}

/* ------------------------------- settings ------------------------------- */

export async function loadSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings> | null>(SETTINGS_KEY, null);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  await writeJson(SETTINGS_KEY, settings);
  return settings;
}

/** Clears profile, contacts, groups, and settings — starts empty. */
export async function resetDemoData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([PROFILE_KEY, CONTACTS_KEY, GROUPS_KEY, SETTINGS_KEY]);
  } catch {
    // Nothing to recover from — the caller re-reads empty defaults.
  }
}

/* -------------------------------- derived ------------------------------- */

export type Stats = {
  total: number;
  thisMonth: number;
  needsReview: number;
  favorites: number;
};

export function contactStats(contacts: Contact[]): Stats {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const from = monthStart.getTime();

  return {
    total: contacts.length,
    thisMonth: contacts.filter((contact) => contact.createdAt >= from).length,
    needsReview: contacts.filter((contact) => (contact.confidence ?? 100) < 90).length,
    favorites: contacts.filter((contact) => contact.favorite).length,
  };
}

export function countInGroup(contacts: Contact[], groupName: string): number {
  return contacts.filter((contact) => contact.group === groupName).length;
}

export type Batch = {
  key: string;
  label: string;
  at: number;
  count: number;
  needsReview: number;
  preview: string[];
};

/** Contacts captured on the same calendar day read as one scan batch on Home. */
export function recentBatches(contacts: Contact[], limit = 3): Batch[] {
  const buckets = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const key = new Date(contact.createdAt).toDateString();
    const bucket = buckets.get(key);
    if (bucket) bucket.push(contact);
    else buckets.set(key, [contact]);
  }

  return [...buckets.values()]
    .map((bucket) => ({
      key: new Date(bucket[0].createdAt).toDateString(),
      label: relativeDate(bucket[0].createdAt),
      at: bucket[0].createdAt,
      count: bucket.length,
      needsReview: bucket.filter((contact) => (contact.confidence ?? 100) < 90).length,
      preview: bucket.slice(0, 3).map((contact) => initialsOf(contact.name)),
    }))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => /[A-Za-z]/.test(part[0] ?? ''));
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

export function relativeDate(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ------------------------------- products ------------------------------- */

export type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  description?: string;
  createdAt: number;
};

export const DEFAULT_CATEGORIES: string[] = [
  'Solar Inverters & PCUs',
  'Uninterruptible Power Supplies (UPS)',
  'Energy Storage Systems (BESS)',
  'Industrial Power Converters & Inverters',
  'Servo Voltage Stabilizers',
  'Industrial Battery Chargers',
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_default_solar',
    name: 'Solar Inverters & PCUs',
    category: 'Solar Inverters & PCUs',
    description: 'Hybrid & On-Grid Solar Inverters and Power Conditioning Units',
    createdAt: 1700000000001,
  },
  {
    id: 'prod_default_ups',
    name: 'Uninterruptible Power Supplies (UPS)',
    category: 'Uninterruptible Power Supplies (UPS)',
    description: 'Online Industrial UPS & Power Backup Solutions',
    createdAt: 1700000000002,
  },
  {
    id: 'prod_default_bess',
    name: 'Energy Storage Systems (BESS)',
    category: 'Energy Storage Systems (BESS)',
    description: 'Lithium Battery Energy Storage Systems (BESS)',
    createdAt: 1700000000003,
  },
  {
    id: 'prod_default_converters',
    name: 'Industrial Power Converters & Inverters',
    category: 'Industrial Power Converters & Inverters',
    description: 'Heavy Duty Static Frequency Converters & Inverters',
    createdAt: 1700000000004,
  },
  {
    id: 'prod_default_stabilizers',
    name: 'Servo Voltage Stabilizers',
    category: 'Servo Voltage Stabilizers',
    description: 'Air/Oil Cooled Precision Servo Voltage Stabilizers',
    createdAt: 1700000000005,
  },
  {
    id: 'prod_default_chargers',
    name: 'Industrial Battery Chargers',
    category: 'Industrial Battery Chargers',
    description: 'Float cum Boost Battery Chargers (FCBC) & SMPS Chargers',
    createdAt: 1700000000006,
  },
];

export async function listProducts(): Promise<Product[]> {
  const stored = await readJson<Product[] | null>(PRODUCTS_KEY, null);
  if (!Array.isArray(stored)) {
    await writeJson(PRODUCTS_KEY, DEFAULT_PRODUCTS);
    return DEFAULT_PRODUCTS.slice().sort((a, b) => b.createdAt - a.createdAt);
  }
  return stored.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export async function addProduct(
  name: string,
  category: string,
  extra?: { imageUrl?: string; description?: string }
): Promise<Product> {
  const products = await listProducts();
  const product: Product = {
    id: newId('prod'),
    name: name.trim(),
    category: category.trim() || 'General',
    imageUrl: extra?.imageUrl?.trim() || undefined,
    description: extra?.description?.trim() || undefined,
    createdAt: Date.now(),
  };
  await writeJson(PRODUCTS_KEY, [product, ...products]);

  // Ensure category is tracked
  if (product.category) {
    await addCategory(product.category);
  }

  return product;
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<Product[]> {
  const products = await listProducts();
  const next = products.map((p) => (p.id === id ? { ...p, ...patch } : p));
  await writeJson(PRODUCTS_KEY, next);
  return next;
}

export async function deleteProduct(id: string): Promise<Product[]> {
  const products = await listProducts();
  const next = products.filter((p) => p.id !== id);
  await writeJson(PRODUCTS_KEY, next);
  return next;
}

/* ------------------------------ categories ------------------------------ */

export async function listCategories(): Promise<string[]> {
  const stored = await readJson<string[] | null>(CATEGORIES_KEY, null);
  if (!Array.isArray(stored)) {
    await writeJson(CATEGORIES_KEY, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return stored;
}

export async function addCategory(categoryName: string): Promise<string[]> {
  const clean = categoryName.trim();
  if (!clean) return listCategories();
  const categories = await listCategories();
  if (categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    return categories;
  }
  const next = [...categories, clean];
  await writeJson(CATEGORIES_KEY, next);
  return next;
}

export async function deleteCategory(categoryName: string): Promise<string[]> {
  const categories = await listCategories();
  const next = categories.filter((c) => c.toLowerCase() !== categoryName.toLowerCase());
  await writeJson(CATEGORIES_KEY, next);
  return next;
}

