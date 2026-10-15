import { describe, expect, it } from 'vitest';

import { fieldsForExportCard } from '../lib/export-card-fields';

describe('fieldsForExportCard', () => {
  const full = {
    name: 'Alex',
    title: 'Designer',
    company: 'Northwind',
    email: 'a@b.co',
    phone: '123',
    website: 'ex.com',
    address: 'Pune',
  };

  it('keeps all fields in full mode', () => {
    expect(fieldsForExportCard(full, 'full')).toEqual({
      company: 'Northwind',
      name: 'Alex',
      title: 'Designer',
      phone: '123',
      email: 'a@b.co',
      address: 'Pune',
      website: 'ex.com',
    });
  });

  it('strips to name phone website in limited mode', () => {
    expect(fieldsForExportCard(full, 'limited')).toEqual({
      company: '',
      name: 'Alex',
      title: '',
      phone: '123',
      email: '',
      address: '',
      website: 'ex.com',
    });
  });

  it('omits blank trimmed values', () => {
    expect(
      fieldsForExportCard(
        { name: '  ', title: '', company: '', email: 'x@y.z', phone: '', website: '' },
        'full'
      )
    ).toEqual({
      company: '',
      name: '',
      title: '',
      phone: '',
      email: 'x@y.z',
      address: '',
      website: '',
    });
  });
});
