import type { QrDetailMode } from '@/lib/qr-card';
import { resolveQrDetailMode } from '@/lib/qr-card';

/** Locked export-card fields — omit empty strings so rows are not drawn. */
export type ExportCardFields = {
  company: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
};

type FieldSource = {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
};

/**
 * Map profile/contact → export rows for the locked card.
 * Limited mode: name + phone + website only (matches vCard limited).
 * Empty values stay empty so ExportCard omits those rows.
 */
export function fieldsForExportCard(
  source: FieldSource,
  mode: QrDetailMode = 'full'
): ExportCardFields {
  const effective = resolveQrDetailMode(source, mode);
  const name = source.name?.trim() ?? '';
  const phone = source.phone?.trim() ?? '';
  const website = source.website?.trim() ?? '';

  if (effective === 'limited') {
    return {
      company: '',
      name,
      title: '',
      phone,
      email: '',
      address: '',
      website,
    };
  }

  return {
    company: source.company?.trim() ?? '',
    name,
    title: source.title?.trim() ?? '',
    phone,
    email: source.email?.trim() ?? '',
    address: source.address?.trim() ?? '',
    website,
  };
}
