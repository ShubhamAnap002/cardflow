import { router } from 'expo-router';

/** Safe dismiss: back if possible, otherwise home tabs. */
export function dismissToHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
