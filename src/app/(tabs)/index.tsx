import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AdBanner } from '@/components/ad-banner';
import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { BrandWordmark, ScanCorners } from '@/components/brand';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { Section } from '@/components/section';
import { EmptyState, QuickAction, StatTile } from '@/components/tiles';
import { colors, fonts, radii, shadows, spacing, type } from '@/constants/theme';
import { contactStats, initialsOf, recentBatches } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

const brandMark = require('../../../assets/images/brand-mark.png');

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
  const scanPulse = useRef(new Animated.Value(0.55)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      scanPulse.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanPulse, {
          toValue: 0.4,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanPulse, reduceMotion]);

  return (
    <Screen>
      <View style={styles.glow} pointerEvents="none" />
      <AppHeader
        title="Home"
        brandHome
        profile={{ initials: initialsOf(profile.name), uri: profile.avatarUri }}
        onProfile={() => router.push('/profile')}
        onSettings={() => router.navigate('/settings')}
      />

      <ScreenBody tabBar>
        <AdBanner />

        <View style={styles.greeting}>
          <Text style={styles.hello}>
            {greeting()}
            {firstName !== 'there' ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.helloSub}>
            {stats.total} contacts · {groups.length} groups
          </Text>
        </View>

        <View style={styles.hero}>
          <ScanCorners inset={14} color={colors.scanAccent} />
          <View style={styles.heroTop}>
            <BrandWordmark size="md" onDark />
            <Text style={styles.heroTag}>SCAN · SAVE · SHARE</Text>
          </View>
          <View style={styles.heroVisual}>
            <Image source={brandMark} style={styles.heroImage} resizeMode="contain" />
            <Animated.View style={[styles.scanLine, { opacity: scanPulse }]} />
          </View>
          <Text style={styles.heroLine}>Capture a card photo or scan a contact QR</Text>
          <PrimaryButton
            label="Start scan"
            icon="document_scanner"
            variant="onPrimary"
            onPress={() => router.push('/scan')}
            style={styles.heroCta}
          />
        </View>

        <View style={styles.row}>
          <QuickAction label="Scan" icon="add_a_photo" onPress={() => router.push('/scan')} />
          <QuickAction
            label="My QR"
            icon="qr_code_2"
            tint={colors.tertiary}
            onPress={() => router.push('/my-qr')}
          />
          <QuickAction
            label="Contacts"
            icon="contacts"
            tint={colors.secondary}
            onPress={() => router.navigate('/contacts')}
          />
          <QuickAction
            label="Favorites"
            icon="star"
            tint={colors.favorite}
            onPress={() => router.navigate('/contacts?filter=favorites')}
          />
        </View>

        <View style={styles.row}>
          <StatTile
            value={String(stats.total)}
            label="Contacts"
            icon="contacts"
            onPress={() => router.navigate('/contacts')}
          />
          <StatTile
            value={String(stats.thisMonth)}
            label="This month"
            icon="insights"
            tint={colors.secondary}
          />
          <StatTile
            value={String(stats.needsReview)}
            label="To review"
            icon="error"
            tint={stats.needsReview > 0 ? colors.error : colors.tertiary}
            onPress={() => router.navigate('/contacts?filter=review')}
          />
        </View>

        <Section
          title="Recent"
          action={contacts.length > 0 ? 'See all' : undefined}
          onAction={() => router.navigate('/contacts')}
        >
          {batches.length === 0 ? (
            <EmptyState
              icon="document_scanner"
              title="No contacts yet"
              body="Start scan for a card photo or QR code. Contacts stay on this phone — use My QR to share your card."
            />
          ) : (
            batches.map((batch) => (
              <Pressable
                key={batch.key}
                accessibilityRole="button"
                accessibilityLabel={`${batch.label} batch, ${batch.count} cards`}
                onPress={() => router.navigate('/contacts')}
                style={({ pressed }) => [styles.batch, pressed && styles.batchPressed]}
              >
                <View style={styles.stack}>
                  {batch.preview.map((initials, index) => (
                    <View
                      key={`${batch.key}-${index}`}
                      style={[styles.stackItem, { marginLeft: index === 0 ? 0 : -12 }]}
                    >
                      <Avatar initials={initials} size={34} seed={`${batch.key}${initials}`} />
                    </View>
                  ))}
                </View>
                <View style={styles.batchCopy}>
                  <Text style={styles.batchTitle}>{batch.label}</Text>
                  <Text style={styles.batchSub} numberOfLines={1}>
                    {batch.count} {batch.count === 1 ? 'card' : 'cards'}
                    {batch.needsReview > 0 ? ` · ${batch.needsReview} to review` : ' · confirmed'}
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
  glow: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primarySoft,
    opacity: 0.7,
  },
  greeting: { gap: 2 },
  hello: { ...type.display, color: colors.onSurface },
  helloSub: { ...type.bodySm, color: colors.onSurfaceVariant },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xxl,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
    alignItems: 'center',
    ...shadows.raised,
  },
  heroTop: { gap: 4, zIndex: 1, alignItems: 'center' },
  heroTag: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  heroVisual: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: 132, height: 132, borderRadius: 28 },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.tertiaryFixed,
  },
  heroLine: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    zIndex: 1,
  },
  heroCta: { marginTop: 2, zIndex: 1, alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: spacing.xs },
  batch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
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
