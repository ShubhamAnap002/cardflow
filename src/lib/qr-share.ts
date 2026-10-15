import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { notify } from '@/lib/feedback';

/** Share a PNG QR from base64 (react-native-qrcode-svg getDataURL). */
export async function shareQrPngBase64(
  base64: string,
  filename = 'cardflow-qr.png'
): Promise<void> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    notify('Could not save the QR image on this device.');
    return;
  }
  const data = base64.includes(',') ? base64.split(',')[1]! : base64;
  const path = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(path, data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await sharePngFile(path, filename);
}

/** Share an existing PNG file path (e.g. view-shot capture). */
export async function sharePngFile(path: string, filename = 'cardflow.png'): Promise<void> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  let sharePath = path;
  if (dir) {
    const named = `${dir}${filename}`;
    if (named !== path) {
      try {
        await FileSystem.copyAsync({ from: path, to: named });
        sharePath = named;
      } catch {
        // Fall back to the original tmp path.
      }
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(sharePath, {
      mimeType: 'image/png',
      dialogTitle: filename.replace(/\.png$/i, '') || 'Share card',
      UTI: 'public.png',
    });
    return;
  }

  await Share.share({ url: sharePath, title: filename });
}
