import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { Section } from '@/components/section';
import { EmptyState, QuickAction, StatTile } from '@/components/tiles';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { contactStats, initialsOf, recentBatches } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { profile, contacts, groups } = useCardflow();

  const stats = useMemo(() => contactStats(contacts), [contacts]);
  const batches = useMemo(() => recentBatches(contacts), [contacts]);
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there';

  return (
    <Screen>
      <AppHeader
        title="Dashboard"
        profile={{ initials: initialsOf(profile.name), uri: profile.avatarUri }}
        onProfile={() => router.push('/profile')}
        onSettings={() => router.push('/(tabs)/settings')}
      />

      <ScreenBody tabBar>
        <View style={styles.greeting}>
          <Text style={styles.hello}>
            {greeting()}, {firstName}
          </Text>
          <Text style={styles.helloSub}>
            {stats.total} contacts captured · {groups.length} groups
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Icon name="auto_awesome" size={13} color={colors.onPrimary} />
            <Text style={styles.heroBadgeText}>BULK CAPTURE</Text>
          </View>
          <Text style={styles.heroTitle}>Turn a stack of cards into contacts</Text>
          <Text style={styles.heroBody}>
            Shoot one card after another — CardFlow keeps the image, you confirm the details, and
            everything stays on your device.
          </Text>
          <PrimaryButton
            label="Start bulk scan"
            icon="document_scanner"
            variant="onPrimary"
            onPress={() => router.push('/scan')}
            style={styles.heroCta}
          />
        </View>

        <View style={styles.row}>
          <QuickAction
            label="Scan card"
            icon="add_a_photo"
            onPress={() => router.push('/scan')}
          />
          <QuickAction
            label="Contacts"
            icon="contacts"
            tint={colors.secondary}
            onPress={() => router.push('/(tabs)/contacts')}
          />
          <QuickAction
            label="Favorites"
            icon="star"
            tint="#F59E0B"
            onPress={() => router.push('/(tabs)/contacts?filter=favorites')}
          />
          <QuickAction
            label="Groups"
            icon="folder_shared"
            tint={colors.tertiary}
            onPress={() => router.push('/(tabs)/groups')}
          />
        </View>

        <View style={styles.row}>
          <StatTile
            value={String(stats.total)}
            label="Total contacts"
            icon="contacts"
            onPress={() => router.push('/(tabs)/contacts')}
          />
          <StatTile
            value={String(stats.thisMonth)}
            label="Added this month"
            icon="insights"
            tint={colors.secondary}
          />
          <StatTile
            value={String(stats.needsReview)}
            label="Needs review"
            icon="error"
            tint={stats.needsReview > 0 ? colors.error : colors.tertiary}
            onPress={() => router.push('/(tabs)/contacts?filter=review')}
          />
        </View>

        <Section
          title="Recent batches"
          action={contacts.length > 0 ? 'See all' : undefined}
          onAction={() => router.push('/(tabs)/contacts')}
        >
          {batches.length === 0 ? (
            <EmptyState
              icon="document_scanner"
              title="No scans yet"
              body="Tap the scan button to capture your first business card."
            />
          ) : (
            batches.map((batch) => (
              <Pressable
                key={batch.key}
                accessibilityRole="button"
                accessibilityLabel={`${batch.label} batch, ${batch.count} cards`}
                onPress={() => router.push('/(tabs)/contacts')}
                style={({ pressed }) => [styles.batch, pressed && styles.batchPressed]}
              >
                <View style={styles.stack}>
                  {batch.preview.map((initials, index) => (
                    <View key={`${batch.key}-${index}`} style={[styles.stackItem, { marginLeft: index === 0 ? 0 : -12 }]}>
                      <Avatar initials={initials} size={34} seed={`${batch.key}${initials}`} />
                    </View>
                  ))}
                </View>
                <View style={styles.batchCopy}>
                  <Text style={styles.batchTitle}>{batch.label}</Text>
                  <Text style={styles.batchSub} numberOfLines={1}>
                    {batch.count} {batch.count === 1 ? 'card' : 'cards'}
                    {batch.needsReview > 0 ? ` · ${batch.needsReview} to review` : ' · all confirmed'}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={colors.outline} />
              </Pressable>
            ))
          )}
        </Section>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 2 },
  hello: { ...type.display, color: colors.onSurface },
  helloSub: { ...type.bodySm, color: colors.onSurfaceVariant },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xxl,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.raised,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroBadgeText: { ...type.eyebrow, color: colors.onPrimary },
  heroTitle: { ...type.headline, color: colors.onPrimary },
  heroBody: { ...type.bodySm, color: '#DBEAFE' },
  heroCta: { marginTop: spacing.xxs },
  row: { flexDirection: 'row', gap: spacing.xs },
  batch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.sm,
    ...shadows.card,
  },
  batchPressed: { backgroundColor: colors.surfaceLow },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { borderWidth: 2, borderColor: colors.surface, borderRadius: radii.pill },
  batchCopy: { flex: 1, minWidth: 0, gap: 2 },
  batchTitle: { ...type.labelLg, color: colors.onSurface, fontWeight: '700' },
  batchSub: { ...type.bodySm, color: colors.onSurfaceVariant },
});
