import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export function useBottomInset(insideTabs: boolean) {
  return insideTabs ? spacing.xl : spacing.lg;
}

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, style }: ScreenProps) {
  return (
    <View style={styles.webContainer}>
      <View style={[styles.screen, style]}>{children}</View>
    </View>
  );
}

type BodyProps = {
  children: ReactNode;
  tabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScreenBody({ children, tabBar = false, contentStyle }: BodyProps) {
  const bottom = useBottomInset(tabBar);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Subtle outer background on desktop
    alignItems: 'center',
    width: '100%',
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    backgroundColor: colors.background,
    // Refined elevation shadow for desktop shell
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    gap: spacing.md,
  },
});
