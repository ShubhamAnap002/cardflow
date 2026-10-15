import { Linking, Share } from 'react-native';

import { exportContactsExcel } from '@/lib/excel';
import { notify } from '@/lib/feedback';
import { encodeAsVCard } from '@/lib/qr-card';
import type { Contact } from '@/lib/storage';
import { openWebUrl } from '@/lib/url-safety';

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
  const first = email
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
  if (!first) return notify('No email address saved for this contact.');
  return open(`mailto:${first}`, 'No email app available.');
}

export function openWebsite(website?: string) {
  if (!website) return notify('No website saved for this contact.');
  openWebUrl(website.trim(), { title: 'Open website' });
}

export function openMap(address?: string) {
  if (!address) return notify('No address saved for this contact.');
  return open(`geo:0,0?q=${encodeURIComponent(address)}`, 'No maps app available.');
}

export async function shareContact(contact: Contact) {
  try {
    await Share.share({
      title: contact.name,
      message: encodeAsVCard({
        name: contact.name,
        title: contact.title,
        company: contact.company,
        email: contact.email,
        phone: contact.phone,
        website: contact.website,
        address: contact.address,
        note: contact.note,
      }),
    });
  } catch {
    notify('Sharing was cancelled.');
  }
}

/** Beautiful Excel (.xlsx) export via the system share sheet. */
export async function exportContacts(contacts: Contact[]) {
  try {
    await exportContactsExcel(contacts);
  } catch {
    notify('Export was cancelled.');
  }
}
