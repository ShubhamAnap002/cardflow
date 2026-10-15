import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, spacing, type } from '@/constants/theme';
import { notify } from '@/lib/feedback';
import {
  LEGAL_PACKAGE,
  LEGAL_UPDATED,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
} from '@/lib/legal-content';
import { getPrivacyUrl, openPrivacyPolicy } from '@/lib/privacy';

export default function PrivacyScreen() {
  async function onOpenWeb() {
    const ok = await openPrivacyPolicy();
    if (!ok) notify(`Could not open ${getPrivacyUrl()}`);
  }

  return (
    <Screen>
      <AppHeader title="Privacy policy" eyebrow="LEGAL" onBack={() => router.back()} />
      <ScreenBody contentStyle={styles.body}>
        <Text style={styles.meta}>
          Last updated: {LEGAL_UPDATED} · {LEGAL_PACKAGE}
        </Text>
        <Text style={styles.intro}>{PRIVACY_INTRO}</Text>

        {PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.block}>
            <Text style={styles.heading}>{section.title}</Text>
            <Text style={styles.copy}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footerNote}>
          Also see our{' '}
          <Link href="/terms" style={styles.link}>
            Terms of Service
          </Link>
          .
        </Text>

        <PrimaryButton
          label="Open hosted policy"
          icon="language"
          variant="tonal"
          onPress={() => void onOpenWeb()}
        />
        <Pressable onPress={() => void onOpenWeb()} accessibilityRole="link">
          <Text style={styles.url}>{getPrivacyUrl()}</Text>
        </Pressable>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  meta: { ...type.bodySm, color: colors.onSurfaceVariant },
  intro: { ...type.body, color: colors.onSurface, lineHeight: 22 },
  block: {
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.sm,
  },
  heading: { ...type.labelLg, color: colors.primary, fontWeight: '700' },
  copy: { ...type.body, color: colors.onSurface, lineHeight: 21 },
  footerNote: { ...type.body, color: colors.onSurfaceVariant, textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '700' },
  url: {
    ...type.bodySm,
    color: colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
