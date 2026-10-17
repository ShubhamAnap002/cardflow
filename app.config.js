/**
 * Dynamic Expo config so production AdMob App IDs can come from EAS env.
 * Falls back to Google sample IDs (safe for local/dev; replace before Production).
 */
const TEST_ADMOB_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_IOS = 'ca-app-pub-3940256099942544~1458002511';

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'CardFlow',
  slug: 'CardFlow',
  version: '1.2.2',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'cardflow',
  userInterfaceStyle: 'light',
  backgroundColor: '#F8FAFC',
  android: {
    package: 'com.shubhamanap.cardflow',
    versionCode: 4,
    permissions: [
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'RECORD_AUDIO',
    ],
    adaptiveIcon: {
      backgroundColor: '#2563EB',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.shubhamanap.cardflow',
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-asset',
    'expo-font',
    'expo-document-picker',
    'expo-secure-store',
    'expo-iap',
    [
      'expo-build-properties',
      {
        android: {
          abiFilters: ['arm64-v8a', 'armeabi-v7a'],
          kotlinVersion: '2.1.20',
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#2563EB',
        image: './assets/images/splash-icon.png',
        imageWidth: 220,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow CardFlow to import business cards from your photo library.',
        cameraPermission:
          'Allow CardFlow to scan business cards and contact QR codes with your camera.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow CardFlow to scan business cards and contact QR codes with your camera.',
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim() || TEST_ADMOB_ANDROID,
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim() || TEST_ADMOB_IOS,
      },
    ],
    'expo-web-browser',
  ],
  extra: {
    router: {},
    eas: {
      projectId: '60083198-67b3-4f4a-a1fd-4cd29806d643',
    },
  },
  updates: {
    url: 'https://u.expo.dev/60083198-67b3-4f4a-a1fd-4cd29806d643',
  },
  owner: 'shubhamanap01',
  // Bare/local `android/` requires a fixed string (policy not allowed).
  runtimeVersion: '1.2.2',
};

module.exports = config;
