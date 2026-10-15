import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandWordmark } from '@/components/brand';
import { Icon, type IconName } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { completeOnboarding } from '@/lib/onboarding';
import { notify } from '@/lib/feedback';

const STEPS: {
  icon: IconName;
  title: string;
  body: string;
}[] = [
  {
    icon: 'document_scanner',
    title: 'Scan a business card',
    body: 'Take a photo or pick from your gallery. CardFlow reads the details so you can save the contact.',
  },
  {
    icon: 'qr_code_2',
    title: 'Scan a contact QR',
    body: 'From the scan menu, choose Scan QR to import a vCard or save a profile link.',
  },
  {
    icon: 'ios_share',
    title: 'Share your card',
    body: 'Fill your profile once, then open My QR to share an image or contact file. Contacts stay on this phone unless you export them.',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  async function finish() {
    setBusy(true);
    try {
      await completeOnboarding();
      router.replace('/(tabs)');
    } catch {
      notify('Could not save. Try again.');
      setBusy(false);
    }
  }

  function onNext() {
    if (last) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <Screen>
      <ScreenBody contentStyle={[styles.body, { paddingBottom: insets.bottom + spacing.md }]}>
        <BrandWordmark size="md" showIcon />
        <Text style={styles.eyebrow}>GET STARTED</Text>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name={current.icon} size={36} color={colors.primary} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.copy}>{current.body}</Text>
        </View>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>

        <PrimaryButton
          label={last ? 'Start using CardFlow' : 'Continue'}
          icon={last ? 'done' : 'arrow_forward'}
          loading={busy}
          onPress={onNext}
        />
        {!last ? (
          <PrimaryButton
            label="Skip"
            variant="ghost"
            disabled={busy}
            onPress={() => void finish()}
          />
        ) : null}
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.primary,
    textAlign: 'center',
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.headline, color: colors.onSurface, textAlign: 'center' },
  copy: { ...type.body, color: colors.onSurfaceVariant, textAlign: 'center' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
  },
  dotOn: { backgroundColor: colors.primary, width: 20 },
});
