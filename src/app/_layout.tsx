import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols/400Regular';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { ICON_FONT } from '@/components/icon';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { hasAcceptedCurrentLegal, onLegalConsentChanged, peekLegalAccepted } from '@/lib/consent';
import { hasCompletedOnboarding, onOnboardingChanged, peekOnboardingCompleted } from '@/lib/onboarding';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}

function RootNavigator() {
  const { configured, loading, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [consentOk, setConsentOk] = useState<boolean | null>(null);
  const [onboardingOk, setOnboardingOk] = useState<boolean | null>(null);

  const inAuth = segments[0] === '(auth)';
  const onAuthCallback = segments[0] === 'auth';
  const onLegalDocs =
    segments[0] === 'legal-consent' ||
    segments[0] === 'privacy' ||
    segments[0] === 'terms';
  const onOnboarding = segments[0] === 'onboarding';
  const gateReady = !loading && consentOk !== null && onboardingOk !== null;

  useEffect(() => {
    let alive = true;
    const refreshLegal = () => {
      const peek = peekLegalAccepted();
      if (peek !== null) {
        setConsentOk(peek);
        return;
      }
      void hasAcceptedCurrentLegal().then((ok) => {
        if (alive) setConsentOk(ok);
      });
    };
    const refreshOnboarding = () => {
      const peek = peekOnboardingCompleted();
      if (peek !== null) {
        setOnboardingOk(peek);
        return;
      }
      void hasCompletedOnboarding().then((ok) => {
        if (alive) setOnboardingOk(ok);
      });
    };
    refreshLegal();
    refreshOnboarding();
    const unsubLegal = onLegalConsentChanged(refreshLegal);
    const unsubOnboarding = onOnboardingChanged(refreshOnboarding);
    return () => {
      alive = false;
      unsubLegal();
      unsubOnboarding();
    };
  }, [session]);

  useEffect(() => {
    if (!gateReady) return;
    if (onAuthCallback) return;

    if (configured) {
      if (!session && !inAuth && !onLegalDocs) {
        router.replace('/(auth)/login');
        return;
      }
      if (session && inAuth) {
        if (!consentOk) router.replace('/legal-consent');
        else if (!onboardingOk) router.replace('/onboarding');
        else router.replace('/(tabs)');
        return;
      }
      if (session && !consentOk && !onLegalDocs) {
        router.replace('/legal-consent');
        return;
      }
      if (session && consentOk && segments[0] === 'legal-consent') {
        router.replace(onboardingOk ? '/(tabs)' : '/onboarding');
        return;
      }
      if (session && consentOk && !onboardingOk && !onOnboarding && !onLegalDocs) {
        router.replace('/onboarding');
        return;
      }
      if (session && consentOk && onboardingOk && onOnboarding) {
        router.replace('/(tabs)');
      }
      return;
    }

    if (!consentOk && !onLegalDocs && segments[0] !== '(auth)') {
      router.replace('/legal-consent');
      return;
    }
    if (consentOk && !onboardingOk && !onOnboarding && !onLegalDocs && segments[0] !== '(auth)') {
      router.replace('/onboarding');
      return;
    }
    if (consentOk && onboardingOk && onOnboarding) {
      router.replace('/(tabs)');
    }
  }, [
    gateReady,
    consentOk,
    onboardingOk,
    configured,
    session,
    inAuth,
    onLegalDocs,
    onOnboarding,
    onAuthCallback,
    segments,
    router,
  ]);

  if (!gateReady && !onAuthCallback) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="legal-consent" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="scan-qr" options={{ animation: 'fade' }} />
        <Stack.Screen name="review" />
        <Stack.Screen name="contact/[id]" />
        <Stack.Screen name="edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-qr" options={{ presentation: 'modal' }} />
        <Stack.Screen name="contact-qr" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [ICON_FONT]: MaterialSymbols_400Regular,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });
  const [webReady] = useState(Platform.OS === 'web');
  const ready = fontsLoaded || Boolean(fontError) || webReady;

  useEffect(() => {
    if (ready) {
      if (Platform.OS !== 'web') {
        void SplashScreen.hideAsync();
      }
      void import('@/lib/ads')
        .then((m) => m.initAds())
        .catch(() => undefined);
    }
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <AuthProvider>
      <AppErrorBoundary>
        <RootNavigator />
      </AppErrorBoundary>
    </AuthProvider>
  );
}
