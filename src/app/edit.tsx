import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import {
  ContactForm,
  draftFrom,
  EMPTY_DRAFT,
  toContact,
  validate,
  type Draft,
  type DraftErrors,
} from '@/components/contact-form';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { EmptyState } from '@/components/tiles';
import { colors, shadows, spacing } from '@/constants/theme';
import { notify } from '@/lib/feedback';
import { getContact, updateContact } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { groups } = useCardflow();
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setState('missing');
      return;
    }
    void getContact(id).then((contact) => {
      if (!active) return;
      if (!contact) return setState('missing');
      setDraft(draftFrom(contact));
      setState('ready');
    });
    return () => {
      active = false;
    };
  }, [id]);

  function change(key: keyof Draft, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function onSave() {
    if (!id) return;
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      notify('Check the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      await updateContact(id, toContact(draft));
      notify('Contact updated.');
      router.back();
    } catch {
      notify('Could not save those changes.');
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Edit contact" eyebrow="CARDFLOW" onBack={() => router.back()} />

      {state === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : state === 'missing' ? (
        <ScreenBody>
          <EmptyState
            icon="error"
            title="Contact not found"
            body="It may have been deleted from this device."
          />
        </ScreenBody>
      ) : (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScreenBody>
            <ContactForm draft={draft} errors={errors} groups={groups} onChange={change} />
          </ScreenBody>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <PrimaryButton
              label="Cancel"
              variant="ghost"
              style={styles.flex}
              disabled={saving}
              onPress={() => router.back()}
            />
            <PrimaryButton
              label="Save changes"
              icon="done"
              loading={saving}
              style={styles.flex}
              onPress={onSave}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    ...shadows.raised,
  },
});
