import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, type } from '@/constants/theme';
import { readCardLayout, type CardLayout } from '@/lib/media';

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shows a scanned card without cropping — landscape and portrait both fit.
 */
export function CardPreview({ uri, style }: Props) {
  const [layout, setLayout] = useState<CardLayout | null>(null);

  useEffect(() => {
    let alive = true;
    readCardLayout(uri)
      .then((next) => {
        if (alive) setLayout(next);
      })
      .catch(() => {
        if (alive) setLayout(null);
      });
    return () => {
      alive = false;
    };
  }, [uri]);

  const aspectRatio = layout?.aspectRatio ?? 1.586;
  const label =
    layout?.orientation === 'portrait'
      ? 'Portrait card'
      : layout?.orientation === 'landscape'
        ? 'Landscape card'
        : null;

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.frame, { aspectRatio }]}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </View>
      {label ? <Text style={styles.caption}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  frame: {
    width: '100%',
    maxHeight: 320,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  caption: { ...type.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' },
});
