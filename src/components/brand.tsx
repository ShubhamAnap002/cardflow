import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';

const brandIcon = require('../../assets/images/icon.png');

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  /** `onDark` = white wordmark on a blue hero */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZES = {
  sm: { icon: 28, text: 18, gap: 8 },
  md: { icon: 36, text: 22, gap: 10 },
  lg: { icon: 52, text: 32, gap: 12 },
} as const;

/** Split-color CardFlow wordmark — brand-first signal. */
export function BrandWordmark({ size = 'md', showIcon = false, onDark, style }: Props) {
  const s = SIZES[size];
  return (
    <View style={[styles.row, { gap: s.gap }, style]} accessibilityRole="header">
      {showIcon ? (
        <Image
          source={brandIcon}
          style={{ width: s.icon, height: s.icon, borderRadius: s.icon * 0.22 }}
          accessibilityLabel="CardFlow"
        />
      ) : null}
      <Text style={[styles.mark, { fontSize: s.text, lineHeight: s.text + 4 }]}>
        <Text style={onDark ? styles.cardOnDark : styles.card}>Card</Text>
        <Text style={onDark ? styles.flowOnDark : styles.flow}>Flow</Text>
      </Text>
    </View>
  );
}

type CornersProps = {
  inset?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Logo-style scan viewfinder corners. */
export function ScanCorners({
  inset = 10,
  color = colors.scanAccent,
  style,
}: CornersProps) {
  const arm = 16;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <View
        style={[
          styles.corner,
          {
            top: inset,
            left: inset,
            width: arm,
            height: arm,
            borderColor: color,
            borderTopWidth: 2.5,
            borderLeftWidth: 2.5,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            top: inset,
            right: inset,
            width: arm,
            height: arm,
            borderColor: color,
            borderTopWidth: 2.5,
            borderRightWidth: 2.5,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: inset,
            left: inset,
            width: arm,
            height: arm,
            borderColor: color,
            borderBottomWidth: 2.5,
            borderLeftWidth: 2.5,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: inset,
            right: inset,
            width: arm,
            height: arm,
            borderColor: color,
            borderBottomWidth: 2.5,
            borderRightWidth: 2.5,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  mark: { fontFamily: fonts.bold, letterSpacing: -0.5 },
  card: { color: colors.onSurface },
  flow: { color: colors.primary },
  cardOnDark: { color: '#FFFFFF' },
  flowOnDark: { color: colors.tertiaryFixed },
  corner: { position: 'absolute' },
});
