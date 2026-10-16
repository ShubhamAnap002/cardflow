import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { ScanSourceSheet } from '@/components/scan-source-sheet';
import { getEntitlementState } from '@/lib/entitlements';
import { notify } from '@/lib/feedback';
import { persistCardImage, stageCardImageForReview } from '@/lib/media';
import { dismissToHome } from '@/lib/navigation';
import { offerQuotaOptions } from '@/lib/scan-paywall';

/**
 * No forced crop aspect — landscape and portrait business cards both work.
 * User can still frame/crop in the system editor.
 */
const PICKER: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.85,
  allowsEditing: true,
  exif: false,
};

export default function ScanScreen() {
  const [busy, setBusy] = useState(false);

  async function capture(source: 'camera' | 'gallery') {
    if (busy) return;
    setBusy(true);

    try {
      const entitlement = await getEntitlementState();
      if (!entitlement.isPro && entitlement.remaining <= 0) {
        const unlocked = await offerQuotaOptions();
        if (!unlocked) return;
      }

      if (Platform.OS !== 'web') {
        const permission =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          notify(
            source === 'camera'
              ? 'Allow camera access to scan business cards.'
              : 'Allow photo access to import a card.'
          );
          return;
        }
      }

      let result;
      if (source === 'camera' && Platform.OS !== 'web') {
        result = await ImagePicker.launchCameraAsync(PICKER);
      } else {
        // On web, launchImageLibraryAsync opens system file browser reliably
        result = await ImagePicker.launchImageLibraryAsync(PICKER);
      }

      const picked = result.canceled ? undefined : result.assets?.[0]?.uri;
      if (!picked) return;

      let uri = picked;
      try {
        uri = await persistCardImage(picked);
      } catch {
        // Fall back to the picker URI if copy fails.
      }

      await stageCardImageForReview(uri);

      if (Platform.OS === 'web') {
        router.replace({ pathname: '/review', params: { staged: '1' } });
      } else {
        router.replace({ pathname: '/review', params: { uri } });
      }
    } catch {
      notify('Could not open that source. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScanSourceSheet
      busy={busy}
      onClose={dismissToHome}
      onCamera={() => capture('camera')}
      onGallery={() => capture('gallery')}
      onQr={() => {
        if (busy) return;
        router.replace('/scan-qr');
      }}
    />
  );
}
