import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IconName } from '@/components/icon';

const PROFILE_KEY = 'cardflow.profile.v1';
const CONTACTS_KEY = 'cardflow.contacts.v1';
const GROUPS_KEY = 'cardflow.groups.v1';
const SETTINGS_KEY = 'cardflow.settings.v1';

export type Profile = {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
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
  /** OCR confidence for scanned cards — drives the "needs review" badges. */
  confidence?: number;
  createdAt: number;
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
  autoEnhance: boolean;
  detectDuplicates: boolean;
  wifiOnlySync: boolean;
  saveCardImages: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  autoEnhance: true,
  detectDuplicates: true,
  wifiOnlySync: false,
  saveCardImages: true,
};

export const DEFAULT_PROFILE: Profile = {
  name: 'Sarah Jenkins',
  title: 'VP Partnerships',
  company: 'CardFlow',
  email: 'sarah@cardflow.app',
  phone: '+1 415 555 0142',
};

const DAY = 86_400_000;

function seedContacts(now: number): Contact[] {
  return [
    {
      id: 'c_marcus',
      name: 'Marcus Vance',
      title: 'Managing Partner',
      company: 'Horizon Venture Capital',
      email: 'm.vance@horizoncap.vc',
      phone: '+1 415 890 2341',
      website: 'horizoncap.vc',
      address: '500 Howard St, Suite 400, San Francisco, CA',
      group: 'Investors & VCs',
      note: 'Met after the AI infrastructure panel. Send the portfolio deck by Tuesday.',
      favorite: true,
      confidence: 99,
      createdAt: now - DAY,
    },
    {
      id: 'c_alex',
      name: 'Alex Morgan',
      title: 'VP Product',
      company: 'Stripe',
      email: 'alex.morgan@stripe.com',
      phone: '+1 415 555 0183',
      website: 'stripe.com',
      group: 'TechCrunch Disrupt 2026',
      confidence: 98,
      createdAt: now - DAY * 2,
    },
    {
      id: 'c_elena',
      name: 'Dr. Elena Rostova',
      title: 'Chief Scientist',
      company: 'DeepBio',
      email: 'elena@deepbio.io',
      phone: '+1 212 555 0114',
      group: 'TechCrunch Disrupt 2026',
      note: 'One phone digit was low confidence — verify before exporting.',
      confidence: 82,
      createdAt: now - DAY * 3,
    },
    {
      id: 'c_maya',
      name: 'Maya Patel',
      title: 'Head of Growth',
      company: 'Linear',
      email: 'maya@linear.app',
      phone: '+1 628 555 0177',
      group: 'Enterprise Leads',
      confidence: 97,
      createdAt: now - DAY * 9,
    },
    {
      id: 'c_michael',
      name: 'Michael Chang',
      title: 'Founder & CEO',
      company: 'ArcLight',
      email: 'michael@arclight.dev',
      phone: '+1 917 555 0126',
      group: 'SaaS Leaders Dinner',
      favorite: true,
      confidence: 96,
      createdAt: now - DAY * 12,
    },
  ];
}

function seedGroups(now: number): Group[] {
  return [
    {
      id: 'g_tc',
      name: 'TechCrunch Disrupt 2026',
      subtitle: 'Event auto-tag • San Francisco',
      icon: 'confirmation_number',
      tint: '#2563EB',
      createdAt: now - DAY,
    },
    {
      id: 'g_investors',
      name: 'Investors & VCs',
      subtitle: 'High engagement • Follow-up weekly',
      icon: 'monetization_on',
      tint: '#4648D4',
      createdAt: now - DAY * 4,
    },
    {
      id: 'g_enterprise',
      name: 'Enterprise Leads',
      subtitle: 'Sales pipeline • Qualified',
      icon: 'domain',
      tint: '#006242',
      createdAt: now - DAY * 9,
    },
    {
      id: 'g_dinner',
      name: 'SaaS Leaders Dinner',
      subtitle: 'Private gathering • Oct 12',
      icon: 'restaurant',
      tint: '#B42318',
      createdAt: now - DAY * 12,
    },
  ];
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage failures must never crash a screen; the in-memory state still updates.
  }
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------- profile -------------------------------- */

export async function loadProfile(): Promise<Profile> {
  const stored = await readJson<Partial<Profile> | null>(PROFILE_KEY, null);
  return { ...DEFAULT_PROFILE, ...(stored ?? {}) };
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  await writeJson(PROFILE_KEY, profile);
  return profile;
}

/* ------------------------------- contacts ------------------------------- */

export async function listContacts(): Promise<Contact[]> {
  const stored = await readJson<Contact[] | null>(CONTACTS_KEY, null);
  if (stored) return stored.slice().sort((a, b) => b.createdAt - a.createdAt);

  const seeded = seedContacts(Date.now());
  await writeJson(CONTACTS_KEY, seeded);
  return seeded;
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
  if (stored) return stored.slice().sort((a, b) => b.createdAt - a.createdAt);

  const seeded = seedGroups(Date.now());
  await writeJson(GROUPS_KEY, seeded);
  return seeded;
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

/** Wipes everything and lets the seed data come back on the next read. */
export async function resetDemoData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([PROFILE_KEY, CONTACTS_KEY, GROUPS_KEY, SETTINGS_KEY]);
  } catch {
    // Nothing to recover from — the caller just re-reads and gets the seeds.
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
  return letters.join('') || 'C';
}

export function relativeDate(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
