import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardPreview } from '@/components/card-preview';
import { Icon } from '@/components/icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  frontUri?: string;
  backUri?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Front + back card photos side-by-side when both exist; tap opens full-screen.
 */
export function CardPair({ frontUri, backUri, style }: Props) {
  const insets = useSafeAreaInsets();
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  if (!frontUri && !backUri) {
    return (
      <View style={[styles.empty, style]}>
        <Icon name="image" size={22} color={colors.outline} />
        <Text style={styles.emptyText}>No card photo</Text>
      </View>
    );
  }

  const both = Boolean(frontUri && backUri);

  return (
    <View style={[styles.wrap, style]}>
      <View style={both ? styles.row : undefined}>
        {frontUri ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View front of card"
            onPress={() => setViewerUri(frontUri)}
            style={both ? styles.half : styles.full}
          >
            {both ? <Text style={styles.sideLabel}>Front</Text> : null}
            <CardPreview uri={frontUri} />
          </Pressable>
        ) : null}
        {backUri ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View back of card"
            onPress={() => setViewerUri(backUri)}
            style={both ? styles.half : styles.full}
          >
            {both ? <Text style={styles.sideLabel}>Back</Text> : null}
            <CardPreview uri={backUri} />
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={Boolean(viewerUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <View style={[styles.viewer, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setViewerUri(null)}
            style={styles.close}
          >
            <Icon name="close" size={22} color={colors.onPrimary} />
          </Pressable>
          {viewerUri ? (
            <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },
  full: { alignSelf: 'stretch' },
  sideLabel: { ...type.label, color: colors.onSurfaceVariant, marginBottom: 4 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
  },
  emptyText: { ...type.bodySm, color: colors.onSurfaceVariant },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  close: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.sm,
  },
  viewerImage: { flex: 1, width: '100%' },
});
