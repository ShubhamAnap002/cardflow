import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { notify } from '@/lib/feedback';
import { completeOAuthFromUrl } from '@/lib/google-auth';
import { resolvePostAuthRoute } from '@/lib/post-auth-route';

/**
 * Deep-link landing for Google OAuth (`cardflow://auth/callback`).
 * Completes the session, runs hydrateSession (wipe / banned / profile), then routes.
 *
 * Cold-start safe: waits for a real deep-link URL before consuming the one-shot latch.
 * A short timeout only checks an already-hydrated session — it does not permanently
 * block a late-arriving `cardflow://` URL.
 */
export default function AuthCallbackScreen() {
  const url = useURL();
  const router = useRouter();
  const { hydrateSession } = useAuth();
  const completed = useRef(false);
  const sessionFallbackTried = useRef(false);

  useEffect(() => {
    if (completed.current) return;

    let cancelled = false;

    const goAfterAuth = async (sessionOk: boolean) => {
      if (cancelled || completed.current) return;
      completed.current = true;
      if (!sessionOk) {
        router.replace('/(auth)/login');
        return;
      }
      try {
        const route = await resolvePostAuthRoute();
        router.replace(route);
      } catch {
        router.replace('/legal-consent');
      }
    };

    const finishWithLink = async (link: string) => {
      if (completed.current || cancelled) return;
      try {
        await completeOAuthFromUrl(link);
      } catch (error) {
        console.warn('OAuth callback', error);
      }

      try {
        const session = await hydrateSession();
        await goAfterAuth(Boolean(session));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Google sign-in failed.';
        if (!cancelled) {
          notify(message);
          completed.current = true;
          router.replace('/(auth)/login');
        }
      }
    };

    const finishWithExistingSession = async () => {
      if (completed.current || cancelled || sessionFallbackTried.current) return;
      sessionFallbackTried.current = true;
      try {
        const session = await hydrateSession();
        if (session) {
          await goAfterAuth(true);
        }
        // If no session yet, keep waiting — deep link may still arrive.
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Google sign-in failed.';
        if (!cancelled) {
          notify(message);
          completed.current = true;
          router.replace('/(auth)/login');
        }
      }
    };

    if (url) {
      void finishWithLink(url);
      return;
    }

    const timeout = setTimeout(() => {
      void finishWithExistingSession();
    }, 2500);

    // Last resort: if the deep link never arrives, leave the spinner.
    const giveUp = setTimeout(() => {
      if (completed.current || cancelled) return;
      completed.current = true;
      router.replace('/(auth)/login');
    }, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearTimeout(giveUp);
    };
  }, [url, router, hydrateSession]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { ...type.body, color: colors.onSurfaceVariant },
});
