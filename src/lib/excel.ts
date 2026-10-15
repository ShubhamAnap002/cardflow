import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { notify } from '@/lib/feedback';
import type { Contact } from '@/lib/storage';

function formatDate(ts: number): string {
  try {
    return new Date(ts).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/** Neutralize Excel formula injection from contact / QR fields. */
function cellText(value: string | number | undefined | null): string {
  if (value == null) return '';
  const text = String(value);
  if (/^[=+\-@]/.test(text)) return `'${text}`;
  return text;
}

/** Build a styled-enough workbook and share a real .xlsx file. */
export async function exportContactsExcel(contacts: Contact[]) {
  if (contacts.length === 0) {
    notify('There are no contacts to export yet.');
    return;
  }

  const rows = contacts.map((c) => ({
    Name: cellText(c.name),
    Title: cellText(c.title),
    Company: cellText(c.company),
    Email: cellText(c.email),
    Phone: cellText(c.phone),
    Website: cellText(c.website ?? ''),
    Address: cellText(c.address ?? ''),
    Group: cellText(c.group ?? ''),
    Note: cellText(c.note ?? ''),
    Favorite: c.favorite ? 'Yes' : 'No',
    Confidence: c.confidence ?? '',
    Created: formatDate(c.createdAt),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 32 },
    { wch: 18 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Contacts');

  const wbout = XLSX.write(book, { type: 'base64', bookType: 'xlsx' });
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    notify('Could not write the Excel file on this device.');
    return;
  }

  const path = `${dir}CardFlow-Contacts-${Date.now()}.xlsx`;
  await FileSystem.writeAsStringAsync(path, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    notify(`Excel saved to ${path}`);
    return;
  }

  await Sharing.shareAsync(path, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export CardFlow contacts',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
}
