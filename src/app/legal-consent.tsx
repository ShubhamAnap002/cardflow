import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandWordmark } from '@/components/brand';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, spacing, type } from '@/constants/theme';
import { acceptLegal } from '@/lib/consent';
import { LEGAL_UPDATED } from '@/lib/legal-content';
import { notify } from '@/lib/feedback';
import { resolvePostAuthRoute } from '@/lib/post-auth-route';

/** Shown once after first sign-in until the current policy version is accepted. */
export default function LegalConsentScreen() {
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  async function onAccept() {
    if (!checked) {
      notify('Please confirm you agree to the Privacy Policy and Terms.');
      return;
    }
    setBusy(true);
    try {
      await acceptLegal();
      router.replace(await resolvePostAuthRoute());
    } catch {
      notify('Could not save your consent. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScreenBody contentStyle={styles.body}>
        <BrandWordmark size="lg" showIcon />
        <Text style={styles.title}>Privacy & terms</Text>
        <Text style={styles.copy}>
          Please review our Privacy Policy and Terms before you continue. Your contacts stay on
          this phone unless you export them. You can delete your account and local data anytime in
          Settings.
        </Text>
        <Text style={styles.meta}>Policy version: {LEGAL_UPDATED}</Text>

        <View style={styles.links}>
          <Link href="/privacy" style={styles.link}>
            Read Privacy Policy
          </Link>
          <Link href="/terms" style={styles.link}>
            Read Terms of Service
          </Link>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          onPress={() => setChecked((v) => !v)}
          style={styles.checkRow}
        >
          <View style={[styles.box, checked && styles.boxOn]}>
            {checked ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>
            I agree to the Privacy Policy and Terms of Service.
          </Text>
        </Pressable>

        <PrimaryButton label="Continue" loading={busy} onPress={() => void onAccept()} />
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
  title: { ...type.headline, color: colors.onSurface },
  copy: { ...type.body, color: colors.onSurfaceVariant, lineHeight: 21 },
  meta: { ...type.bodySm, color: colors.outline },
  links: { gap: spacing.xs, marginVertical: spacing.xs },
  link: { ...type.labelLg, color: colors.primary, fontWeight: '700' },
  checkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: colors.onPrimary, fontWeight: '700', fontSize: 12 },
  checkLabel: { ...type.body, color: colors.onSurface, flex: 1, lineHeight: 20 },
});
