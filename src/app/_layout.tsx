import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ICON_FONT } from '@/components/icon';
import { colors } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Every icon is a glyph from this font, so hold the splash until it is ready.
  const [fontsLoaded, fontError] = useFonts({ [ICON_FONT]: MaterialSymbols_400Regular });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="review" />
        <Stack.Screen name="contact/[id]" />
        <Stack.Screen name="edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
