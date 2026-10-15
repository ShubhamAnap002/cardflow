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

/** Build a styled-enough workbook and trigger browser download. */
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

  const filename = `CardFlow-Contacts-${Date.now()}.xlsx`;
  try {
    XLSX.writeFile(book, filename);
    notify('Excel file downloaded.');
  } catch {
    notify('Could not export Excel file on this browser.');
  }
}
