import { Image, StyleSheet, Text, View } from 'react-native';

import { ACCENTS, colors, radii } from '@/constants/theme';

type Props = {
  initials: string;
  uri?: string;
  size?: number;
  /** Any stable string (id/name) — picks a consistent accent colour. */
  seed?: string;
  rounded?: boolean;
};

function accentFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % 997;
  return ACCENTS[hash % ACCENTS.length];
}

export function Avatar({ initials, uri, size = 44, seed, rounded }: Props) {
  const radius = rounded ? radii.lg : size / 2;
  const shape = { width: size, height: size, borderRadius: radius };

  if (uri) return <Image source={{ uri }} style={[styles.base, shape]} />;

  return (
    <View style={[styles.base, shape, { backgroundColor: accentFor(seed ?? initials) }]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  text: { color: colors.onPrimary, fontWeight: '700' },
});
