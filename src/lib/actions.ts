import { Linking, Share } from 'react-native';

import { notify } from '@/lib/feedback';
import type { Contact, Profile } from '@/lib/storage';

async function open(url: string, fallback: string) {
  try {
    await Linking.openURL(url);
  } catch {
    notify(fallback);
  }
}

export function callNumber(phone?: string) {
  if (!phone) return notify('No phone number saved for this contact.');
  return open(`tel:${phone.replace(/[^\d+]/g, '')}`, 'No dialer app available.');
}

export function sendEmail(email?: string) {
  if (!email) return notify('No email address saved for this contact.');
  return open(`mailto:${email}`, 'No email app available.');
}

export function openWebsite(website?: string) {
  if (!website) return notify('No website saved for this contact.');
  const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  return open(url, 'Could not open that link.');
}

export function openMap(address?: string) {
  if (!address) return notify('No address saved for this contact.');
  return open(`geo:0,0?q=${encodeURIComponent(address)}`, 'No maps app available.');
}

function vcard(fields: { name: string; title: string; company: string; email: string; phone: string; website?: string }) {
  return [
    fields.name,
    [fields.title, fields.company].filter(Boolean).join(' · '),
    fields.phone,
    fields.email,
    fields.website,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function shareContact(contact: Contact) {
  try {
    await Share.share({ title: contact.name, message: vcard(contact) });
  } catch {
    notify('Sharing was cancelled.');
  }
}

export async function shareProfile(profile: Profile) {
  try {
    await Share.share({ title: profile.name, message: vcard(profile) });
  } catch {
    notify('Sharing was cancelled.');
  }
}

/** Plain-text export of the whole address book — handed off to the share sheet. */
export async function exportContacts(contacts: Contact[]) {
  if (contacts.length === 0) return notify('There are no contacts to export yet.');
  const csv = [
    'Name,Title,Company,Email,Phone,Group',
    ...contacts.map((contact) =>
      [contact.name, contact.title, contact.company, contact.email, contact.phone, contact.group ?? '']
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');

  try {
    await Share.share({ title: 'CardFlow contacts', message: csv });
  } catch {
    notify('Export was cancelled.');
  }
}
