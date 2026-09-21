import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

/**
 * Bottom padding for a page body. Tab screens need almost none: the dock is a
 * sibling in the navigator's column layout, so it never overlaps the scene and
 * already absorbs the safe-area inset. Pushed screens pay the inset themselves.
 */
export function useBottomInset(insideTabs: boolean) {
  const insets = useSafeAreaInsets();
  return insideTabs ? spacing.lg : insets.bottom + spacing.lg;
}

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, style }: ScreenProps) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

type BodyProps = {
  children: ReactNode;
  /** Set on screens rendered inside the tab navigator. */
  tabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Scrollable page body with tight, design-matched spacing (no empty min-heights). */
export function ScreenBody({ children, tabBar = false, contentStyle }: BodyProps) {
  const bottom = useBottomInset(tabBar);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
});
