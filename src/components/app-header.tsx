import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BrandWordmark } from '@/components/brand';
import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';

const brandIcon = require('../../assets/images/icon.png');

type Props = {
  title: string;
  eyebrow?: string;
  /** When true, show CardFlow wordmark instead of title stack (home). */
  brandHome?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  profile?: { initials: string; uri?: string };
  onProfile?: () => void;
};

export function AppHeader({
  title,
  eyebrow = 'CardFlow',
  brandHome,
  onBack,
  onSettings,
  profile,
  onProfile,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            >
              <Icon name="arrow_back" size={22} color={colors.onSurface} />
            </Pressable>
          ) : (
            <Image source={brandIcon} style={styles.logo} resizeMode="cover" accessibilityLabel="CardFlow" />
          )}
          {brandHome ? (
            <BrandWordmark size="sm" />
          ) : (
            <View style={styles.titles}>
              <Text style={styles.eyebrow} numberOfLines={1}>
                {eyebrow.toUpperCase()}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.right}>
          {onSettings ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={8}
              onPress={onSettings}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            >
              <Icon name="settings" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
          {profile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              hitSlop={8}
              onPress={onProfile}
              style={({ pressed }) => [styles.avatarBtn, pressed && styles.iconBtnPressed]}
            >
              <View style={styles.avatarRing}>
                <Avatar initials={profile.initials} uri={profile.uri} size={32} seed="me" />
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    ...shadows.card,
  },
  row: {
    height: 58,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  titles: { flex: 1, minWidth: 0 },
  eyebrow: { ...type.eyebrow, color: colors.primary },
  title: { ...type.title, color: colors.onSurface },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: colors.surfaceLow },
  avatarBtn: { padding: 2, borderRadius: radii.pill },
  avatarRing: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.tertiaryFixed,
    padding: 1,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
  },
});
