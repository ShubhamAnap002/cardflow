import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandWordmark, ScanCorners } from '@/components/brand';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { authColors } from '@/constants/auth-theme';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';

const brandMark = require('../../assets/images/brand-mark.png');

type ShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/** Light brand auth canvas — centered logo + scan-frame form. */
export function AuthShell({ title, subtitle, children }: ShellProps) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.35)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (reduceMotion) {
      pulse.setValue(0.7);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, rise, reduceMotion]);

  return (
    <Screen style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.body,
              {
                opacity: rise,
                transform: [
                  {
                    translateY: rise.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.hero}>
              <View style={styles.markWrap}>
                <Image source={brandMark} style={styles.mark} resizeMode="contain" />
                <Animated.View style={[styles.scanLine, { opacity: pulse }]} />
              </View>
              <BrandWordmark size="lg" style={styles.wordmark} />
            </View>

            <View style={styles.frame}>
              <ScanCorners />
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {children}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type FieldProps = TextInputProps & {
  label: string;
};

export function AuthField({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={authColors.muted}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'neon' | 'ghost';
  icon?: 'person' | 'mail';
};

export function AuthButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'neon',
  icon,
}: ButtonProps) {
  const neon = variant === 'neon';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        neon ? styles.btnNeon : styles.btnGhost,
        (pressed || loading) && { opacity: 0.88 },
        disabled && { opacity: 0.45 },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={18} color={neon ? colors.onPrimary : colors.primary} />
      ) : null}
      <Text style={[styles.btnLabel, neon ? styles.btnLabelNeon : styles.btnLabelGhost]}>
        {loading ? 'Please wait…' : label}
      </Text>
    </Pressable>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <Text style={styles.dividerText}>or email</Text>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  glowTop: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primarySoft,
    opacity: 0.85,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primarySoft,
    opacity: 0.55,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  body: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: spacing.xs },
  markWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 120,
    height: 120,
    borderRadius: 28,
    ...shadows.card,
  },
  wordmark: { alignSelf: 'center' },
  scanLine: {
    position: 'absolute',
    left: 22,
    right: 22,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.tertiaryFixed,
    shadowColor: colors.tertiaryFixed,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  frame: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.card,
  },
  title: {
    ...type.headline,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  subtitle: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  field: { gap: 6 },
  label: {
    ...type.label,
    color: colors.onSurfaceVariant,
  },
  input: {
    minHeight: 50,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.sm,
    ...type.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  btn: {
    minHeight: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  btnNeon: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnGhost: {
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  btnLabel: { ...type.labelLg },
  btnLabelNeon: { color: colors.onPrimary },
  btnLabelGhost: { color: colors.primary },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: 2,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant },
  dividerText: {
    ...type.eyebrow,
    color: colors.outline,
  },
});
