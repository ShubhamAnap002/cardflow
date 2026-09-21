import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  label: string;
  icon?: IconName;
  iconColor?: string;
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'success' | 'warning';
};

const TONES = {
  neutral: { bg: colors.surfaceContainer, fg: colors.onSurfaceVariant },
  success: { bg: colors.tertiarySoft, fg: colors.tertiary },
  warning: { bg: colors.errorSoft, fg: colors.onErrorSoft },
};

export function Chip({ label, icon, iconColor, count, selected, onPress, tone = 'neutral' }: Props) {
  const palette = TONES[tone];
  const fg = selected ? colors.onPrimary : palette.fg;
  const body = (
    <>
      {icon ? <Icon name={icon} size={16} color={iconColor ?? fg} /> : null}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {typeof count === 'number' ? (
        <Text style={[styles.count, { color: fg }]}>{count}</Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.chip, { backgroundColor: palette.bg }]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? colors.primary : palette.bg },
        pressed && !selected && styles.pressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  pressed: { backgroundColor: colors.surfaceHigh },
  label: { ...type.label },
  count: { ...type.label, opacity: 0.7 },
});
