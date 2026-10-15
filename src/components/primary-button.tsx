import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Variant = 'primary' | 'tonal' | 'ghost' | 'onPrimary';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  trailingIcon?: IconName;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TINT: Record<Variant, { bg: string; pressed: string; fg: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary },
  tonal: { bg: colors.surfaceContainer, pressed: colors.surfaceHigh, fg: colors.primary },
  ghost: { bg: colors.surfaceLow, pressed: colors.surfaceContainer, fg: colors.onSurfaceVariant },
  onPrimary: { bg: colors.surface, pressed: colors.surfaceLow, fg: colors.primary },
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  trailingIcon,
  variant = 'primary',
  loading,
  disabled,
  compact,
  style,
}: Props) {
  const tint = TINT[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        variant === 'primary' && styles.primaryShadow,
        { backgroundColor: pressed ? tint.pressed : tint.bg },
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={compact ? 17 : 19} color={tint.fg} /> : null}
          <Text style={[styles.label, { color: tint.fg }]} numberOfLines={1}>
            {label}
          </Text>
          {trailingIcon ? <Icon name={trailingIcon} size={16} color={tint.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compact: { minHeight: 40, paddingHorizontal: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: { ...type.labelLg, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  primaryShadow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
