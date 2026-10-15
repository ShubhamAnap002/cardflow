import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/constants/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Catches render crashes so the app can recover instead of a white screen. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('AppErrorBoundary', error.message, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root} accessibilityRole="alert">
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          CardFlow hit an unexpected error. You can try again — your contacts on this device are
          usually safe.
        </Text>
        <Text style={styles.detail} numberOfLines={4}>
          {this.state.error.message}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ error: null })}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...type.headline, color: colors.onSurface },
  body: { ...type.body, color: colors.onSurfaceVariant, lineHeight: 21 },
  detail: { ...type.bodySm, color: colors.outline },
  btn: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...type.labelLg, color: colors.onPrimary, fontWeight: '700' },
});
