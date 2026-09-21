import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';

import { ScanSourceSheet } from '@/components/scan-source-sheet';
import { notify } from '@/lib/feedback';

const PICKER: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  allowsEditing: true,
};

export default function ScanScreen() {
  const [busy, setBusy] = useState(false);

  async function capture(source: 'camera' | 'gallery') {
    if (busy) return;
    setBusy(true);

    try {
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
        setBusy(false);
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PICKER)
          : await ImagePicker.launchImageLibraryAsync(PICKER);

      const uri = result.canceled ? undefined : result.assets?.[0]?.uri;
      if (!uri) {
        setBusy(false);
        return;
      }

      router.replace({ pathname: '/review', params: { uri } });
    } catch {
      notify('Could not open that source. Please try again.');
      setBusy(false);
    }
  }

  return (
    <ScanSourceSheet
      busy={busy}
      onClose={() => router.back()}
      onCamera={() => capture('camera')}
      onGallery={() => capture('gallery')}
    />
  );
}
