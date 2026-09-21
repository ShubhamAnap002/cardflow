import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { Contact, Group, NewContact } from '@/lib/storage';

export type Draft = {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  group: string;
  note: string;
};

export type DraftErrors = Partial<Record<keyof Draft, string>>;

export const EMPTY_DRAFT: Draft = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  group: '',
  note: '',
};

export function draftFrom(contact: Contact): Draft {
  return {
    name: contact.name,
    title: contact.title,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    website: contact.website ?? '',
    address: contact.address ?? '',
    group: contact.group ?? '',
    note: contact.note ?? '',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validate(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) errors.name = 'A name is required.';
  if (draft.email.trim() && !EMAIL_RE.test(draft.email.trim())) {
    errors.email = 'That email address looks wrong.';
  }
  if (draft.phone.trim() && draft.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'That phone number looks too short.';
  }
  return errors;
}

/** Trimmed payload ready for `addContact` / `updateContact`. */
export function toContact(draft: Draft, extra: Partial<NewContact> = {}): NewContact {
  return {
    name: draft.name.trim(),
    title: draft.title.trim(),
    company: draft.company.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    website: draft.website.trim() || undefined,
    address: draft.address.trim() || undefined,
    group: draft.group.trim() || undefined,
    note: draft.note.trim() || undefined,
    ...extra,
  };
}

type FieldDef = {
  key: keyof Draft;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  multiline?: boolean;
};

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Full name', placeholder: 'Marcus Vance' },
  { key: 'title', label: 'Job title', placeholder: 'Managing Partner' },
  { key: 'company', label: 'Company', placeholder: 'Horizon Venture Capital' },
  {
    key: 'email',
    label: 'Email',
    placeholder: 'name@company.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
  { key: 'phone', label: 'Phone', placeholder: '+1 415 555 0142', keyboardType: 'phone-pad' },
  {
    key: 'website',
    label: 'Website',
    placeholder: 'company.com',
    keyboardType: 'url',
    autoCapitalize: 'none',
  },
  { key: 'address', label: 'Address', placeholder: 'Street, city, state', multiline: true },
  { key: 'note', label: 'Note', placeholder: 'Where you met, what to follow up on…', multiline: true },
];

type Props = {
  draft: Draft;
  errors: DraftErrors;
  groups: Group[];
  onChange: (key: keyof Draft, value: string) => void;
};

export function ContactForm({ draft, errors, groups, onChange }: Props) {
  return (
    <View style={styles.form}>
      {FIELDS.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            value={draft[field.key]}
            onChangeText={(value) => onChange(field.key, value)}
            placeholder={field.placeholder}
            placeholderTextColor={colors.outline}
            style={[
              styles.input,
              field.multiline && styles.inputMultiline,
              errors[field.key] ? styles.inputError : null,
            ]}
            keyboardType={field.keyboardType ?? 'default'}
            autoCapitalize={field.autoCapitalize ?? 'words'}
            autoCorrect={false}
            multiline={field.multiline}
          />
          {errors[field.key] ? <Text style={styles.error}>{errors[field.key]}</Text> : null}
        </View>
      ))}

      {groups.length > 0 ? (
        <View style={styles.field}>
          <Text style={styles.label}>Group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip
              label="None"
              selected={!draft.group}
              onPress={() => onChange('group', '')}
            />
            {groups.map((group) => (
              <Chip
                key={group.id}
                label={group.name}
                selected={draft.group === group.name}
                onPress={() => onChange('group', group.name)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  field: { gap: spacing.xxs + 1 },
  label: { ...type.label, color: colors.onSurfaceVariant },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...type.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputMultiline: { minHeight: 68, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  error: { ...type.label, color: colors.onErrorSoft, fontWeight: '500' },
  chips: { flexDirection: 'row', gap: spacing.xs, paddingVertical: 2 },
});
