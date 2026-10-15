import { Platform, Image } from 'react-native';

/** Copy a picker/camera URI into durable app storage (on native only). */
export async function persistCardImage(uri: string): Promise<string> {
  if (Platform.OS === 'web' || !uri) return uri;

  try {
    const FileSystem = await import('expo-file-system/legacy');
    if (!FileSystem.documentDirectory) return uri;
    if (uri.startsWith(FileSystem.documentDirectory)) return uri;

    const cardsDir = `${FileSystem.documentDirectory}cards/`;
    await FileSystem.makeDirectoryAsync(cardsDir, { intermediates: true }).catch(() => undefined);

    const extMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const dest = `${cardsDir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/** Read image bytes as base64 (no data: prefix). Works seamlessly on Web and Native. */
export async function imageUriToBase64(uri: string): Promise<string> {
  if (!uri) return '';

  // Already a data URL
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    return comma !== -1 ? uri.slice(comma + 1) : uri;
  }

  // Web / Browser environment (blob: or http: or local object URL)
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const comma = result.indexOf(',');
          resolve(comma !== -1 ? result.slice(comma + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // Fall through if native FileSystem is available
    }
  }

  // Native (Android/iOS) FileSystem
  try {
    const FileSystem = await import('expo-file-system/legacy');
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (err) {
    throw new Error(
      'Could not convert image to base64: ' +
        (err instanceof Error ? err.message : String(err))
    );
  }
}

export type CardLayout = {
  width: number;
  height: number;
  /** width / height */
  aspectRatio: number;
  orientation: 'landscape' | 'portrait' | 'square';
};

export function readCardLayout(uri: string): Promise<CardLayout> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        if (!width || !height) {
          reject(new Error('Could not measure card image'));
          return;
        }
        const aspectRatio = width / height;
        const orientation =
          aspectRatio > 1.08 ? 'landscape' : aspectRatio < 0.92 ? 'portrait' : 'square';
        resolve({ width, height, aspectRatio, orientation });
      },
      reject
    );
  });
}
