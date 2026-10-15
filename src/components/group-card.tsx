import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import type { Group } from '@/lib/storage';

type Props = {
  group: Group;
  count: number;
  onPress?: () => void;
  onDelete?: () => void;
};

export function GroupCard({ group, count, onPress, onDelete }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}, ${count} contacts`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.tile, { backgroundColor: `${group.tint}1A` }]}>
        <Icon name={group.icon} size={24} color={group.tint} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {group.subtitle}
        </Text>
        <View style={styles.countRow}>
          <Text style={styles.count}>{count} contacts</Text>
          <Text style={styles.dot}>•</Text>
          <Icon name="smartphone" size={13} color={colors.outline} />
          <Text style={styles.onDevice}>On this device</Text>
        </View>
      </View>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${group.name}`}
          hitSlop={8}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.deletePressed]}
        >
          <Icon name="delete" size={20} color={colors.onErrorSoft} />
        </Pressable>
      ) : (
        <Icon name="chevron_right" size={22} color={colors.outline} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.sm,
    ...shadows.card,
  },
  pressed: { backgroundColor: colors.surfaceLow },
  tile: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...type.labelLg, color: colors.onSurface },
  subtitle: { ...type.bodySm, color: colors.onSurfaceVariant },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: 2 },
  count: { ...type.label, color: colors.primary },
  dot: { ...type.label, color: colors.outlineVariant },
  onDevice: { ...type.label, color: colors.outline },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorSoft,
  },
  deletePressed: { opacity: 0.85 },
});
