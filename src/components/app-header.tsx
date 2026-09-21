import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  onSettings?: () => void;
  profile?: { initials: string; uri?: string };
  onProfile?: () => void;
};

function LogoMark() {
  return (
    <View style={styles.logo}>
      <View style={styles.logoCard}>
        <View style={styles.logoLine} />
        <View style={[styles.logoLine, styles.logoLineShort]} />
      </View>
      <View style={styles.logoDot} />
    </View>
  );
}

export function AppHeader({ title, eyebrow = 'CardFlow AI', onBack, onSettings, profile, onProfile }: Props) {
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
            <LogoMark />
          )}
          <View style={styles.titles}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow.toUpperCase()}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
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
              <Icon name="settings" size={22} />
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
              <Avatar initials={profile.initials} uri={profile.uri} size={34} seed="me" />
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
    height: 56,
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
  avatarBtn: { padding: 3, borderRadius: radii.pill },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    width: 22,
    height: 15,
    borderRadius: 3,
    backgroundColor: colors.onPrimary,
    paddingHorizontal: 3,
    paddingTop: 4,
    gap: 2.5,
  },
  logoLine: { height: 2, borderRadius: 1, backgroundColor: colors.primary },
  logoLineShort: { width: 9, backgroundColor: '#93C5FD' },
  logoDot: {
    position: 'absolute',
    right: 6,
    bottom: 7,
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.tertiaryFixed,
  },
});
