import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  busy?: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
};

type OptionProps = {
  icon: IconName;
  tint: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress: () => void;
};

function Option({ icon, tint, title, subtitle, disabled, onPress }: OptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
        disabled && styles.optionDisabled,
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: `${tint}1F` }]}>
        <Icon name={icon} size={22} color={tint} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <Icon name="chevron_right" size={22} color={colors.outline} />
    </Pressable>
  );
}

/** Bottom sheet rendered inside the transparent `/scan` route. */
export function ScanSourceSheet({ busy, onClose, onCamera, onGallery }: Props) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [380, 0] });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + spacing.lg, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>Scan a business card</Text>
        <Text style={styles.sub}>
          Lay the card flat and fill the frame — CardFlow reads the details for you.
        </Text>

        <Option
          icon="photo_camera"
          tint={colors.primary}
          title="Take a photo"
          subtitle="Use the camera to capture a card"
          disabled={busy}
          onPress={onCamera}
        />
        <Option
          icon="photo_library"
          tint={colors.tertiary}
          title="Choose from gallery"
          subtitle="Import a card you already photographed"
          disabled={busy}
          onPress={onGallery}
        />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
        >
          <Text style={styles.cancelText}>{busy ? 'Opening…' : 'Cancel'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(19,27,46,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  title: { ...type.headline, color: colors.onSurface },
  sub: { ...type.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.xxs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 66,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
  },
  optionPressed: { backgroundColor: colors.surfaceContainer },
  optionDisabled: { opacity: 0.5 },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { ...type.labelLg, color: colors.onSurface, fontWeight: '700' },
  optionSub: { ...type.bodySm, color: colors.onSurfaceVariant },
  cancel: {
    marginTop: spacing.xxs,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceLow,
  },
  cancelPressed: { backgroundColor: colors.surfaceContainer },
  cancelText: { ...type.labelLg, color: colors.onSurfaceVariant, fontWeight: '700' },
});
