import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import type { Group } from '@/lib/storage';

type Props = {
  group: Group;
  count: number;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function GroupCard({ group, count, onPress, onLongPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}, ${count} contacts`}
      onPress={onPress}
      onLongPress={onLongPress}
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
          {count > 0 ? (
            <>
              <Text style={styles.dot}>•</Text>
              <Icon name="cloud_done" size={13} color={colors.tertiary} />
              <Text style={styles.synced}>Synced</Text>
            </>
          ) : null}
        </View>
      </View>
      <Icon name="chevron_right" size={22} color={colors.outline} />
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
  name: { ...type.labelLg, color: colors.onSurface, fontWeight: '700' },
  subtitle: { ...type.bodySm, color: colors.onSurfaceVariant },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: 2 },
  count: { ...type.label, color: colors.primary },
  dot: { ...type.label, color: colors.outlineVariant },
  synced: { ...type.label, color: colors.tertiary },
});
