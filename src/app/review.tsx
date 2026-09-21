import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import {
  ContactForm,
  EMPTY_DRAFT,
  toContact,
  validate,
  type Draft,
  type DraftErrors,
} from '@/components/contact-form';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { notify } from '@/lib/feedback';
import { addContact } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

const STEPS = ['Reading the card', 'Straightening the image', 'Opening the details'];

export default function ReviewScreen() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const { groups } = useCardflow();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);

  // Short, honest processing beat: the capture is prepared, then you confirm it.
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 450),
      setTimeout(() => setStep(2), 900),
      setTimeout(() => setReady(true), 1350),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  function change(key: keyof Draft, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function save(andScanAnother: boolean) {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      notify('Check the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const contact = await addContact(toContact(draft, { cardUri: uri }));
      notify(`${contact.name} saved.`);
      if (andScanAnother) router.replace('/scan');
      else router.replace(`/contact/${contact.id}`);
    } catch {
      notify('Could not save that contact. Please try again.');
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title={ready ? 'Review card' : 'Processing'}
        eyebrow="NEW CONTACT"
        onBack={() => router.back()}
      />

      {ready ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScreenBody contentStyle={styles.reviewContent}>
            {uri ? <Image source={{ uri }} style={styles.card} resizeMode="cover" /> : null}

            <View style={styles.notice}>
              <Icon name="info" size={16} color={colors.primary} />
              <Text style={styles.noticeText}>
                Confirm the details from the card. The photo is kept with the contact so you can
                always check it later.
              </Text>
            </View>

            <ContactForm draft={draft} errors={errors} groups={groups} onChange={change} />
          </ScreenBody>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <PrimaryButton
              label="Save & scan next"
              variant="tonal"
              icon="add_a_photo"
              disabled={saving}
              style={styles.flex}
              onPress={() => save(true)}
            />
            <PrimaryButton
              label="Save contact"
              icon="done"
              loading={saving}
              style={styles.flex}
              onPress={() => save(false)}
            />
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.processing}>
          {uri ? <Image source={{ uri }} style={styles.preview} resizeMode="cover" /> : null}
          <ActivityIndicator color={colors.primary} />
          <View style={styles.steps}>
            {STEPS.map((label, index) => (
              <View key={label} style={styles.step}>
                <Icon
                  name={index < step ? 'check_circle' : 'hourglass_empty'}
                  size={17}
                  color={index < step ? colors.tertiary : colors.outlineVariant}
                />
                <Text style={[styles.stepText, index < step && styles.stepDone]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  reviewContent: { gap: spacing.sm },
  card: {
    width: '100%',
    aspectRatio: 1.7,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  noticeText: { ...type.bodySm, color: colors.onSurface, flex: 1 },
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
  processing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  preview: {
    width: '100%',
    aspectRatio: 1.7,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
  },
  steps: { gap: spacing.xs, alignSelf: 'stretch' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepText: { ...type.body, color: colors.onSurfaceVariant },
  stepDone: { color: colors.onSurface, fontWeight: '600' },
});
