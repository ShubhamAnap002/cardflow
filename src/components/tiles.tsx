import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';

type StatProps = {
  value: string;
  label: string;
  icon: IconName;
  tint?: string;
  onPress?: () => void;
};

export function StatTile({ value, label, icon, tint = colors.primary, onPress }: StatProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && onPress ? styles.pressed : null]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${tint}1A` }]}>
        <Icon name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

type ActionProps = {
  label: string;
  icon: IconName;
  tint?: string;
  onPress: () => void;
};

export function QuickAction({ label, icon, tint = colors.primary, onPress }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${tint}1A` }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Empty-state block used by the contacts and groups lists. */
export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { backgroundColor: colors.surfaceLow },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: 2,
    ...shadows.card,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  statValue: { ...type.headline, color: colors.onSurface },
  statLabel: { ...type.label, color: colors.onSurfaceVariant, fontWeight: '500' },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs + 2,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    ...shadows.card,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { ...type.label, color: colors.onSurface, textAlign: 'center' },
  empty: {
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyTitle: { ...type.title, color: colors.onSurface },
  emptyBody: { ...type.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' },
});
