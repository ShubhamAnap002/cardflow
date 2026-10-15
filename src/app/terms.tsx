import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, spacing, type } from '@/constants/theme';
import {
  LEGAL_PACKAGE,
  LEGAL_UPDATED,
  TERMS_INTRO,
  TERMS_SECTIONS,
} from '@/lib/legal-content';

export default function TermsScreen() {
  return (
    <Screen>
      <AppHeader title="Terms of Service" eyebrow="LEGAL" onBack={() => router.back()} />
      <ScreenBody contentStyle={styles.body}>
        <Text style={styles.meta}>
          Last updated: {LEGAL_UPDATED} · {LEGAL_PACKAGE}
        </Text>
        <Text style={styles.intro}>{TERMS_INTRO}</Text>

        {TERMS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.block}>
            <Text style={styles.heading}>{section.title}</Text>
            <Text style={styles.copy}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footerNote}>
          Also see our{' '}
          <Link href="/privacy" style={styles.link}>
            Privacy Policy
          </Link>
          .
        </Text>
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
});
