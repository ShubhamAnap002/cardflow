import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { getPrivacyUrl } from '@/lib/privacy-url';

export { getPrivacyUrl } from '@/lib/privacy-url';

async function openHttps(url: string): Promise<boolean> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      toolbarColor: '#F8FAFC',
      controlsColor: '#2563EB',
    });
    return true;
  } catch {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return false;
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export async function openPrivacyPolicy(): Promise<boolean> {
  return openHttps(getPrivacyUrl());
}
