import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  /** Optional trailing link, e.g. "See all". */
  action?: string;
  onAction?: () => void;
  children: ReactNode;
};

export function Section({ title, action, onAction, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action}
            hitSlop={8}
            onPress={onAction}
            style={styles.action}
          >
            <Text style={styles.actionText}>{action}</Text>
            <Icon name="chevron_right" size={16} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.title, color: colors.onSurface },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { ...type.label, color: colors.primary },
});
