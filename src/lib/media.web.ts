export type CardLayout = {
  width: number;
  height: number;
  /** width / height */
  aspectRatio: number;
  orientation: 'landscape' | 'portrait' | 'square';
};

/**
 * On web, convert blob: URIs to base64 data URLs so they persist across page refreshes in AsyncStorage.
 */
export async function persistCardImage(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  try {
    const base64 = await imageUriToBase64(uri);
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return uri;
  }
}

/** Read image bytes as base64 (no data: prefix) using browser FileReader / fetch. */
export async function imageUriToBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    const parts = uri.split(',');
    return parts.length > 1 ? parts[1]! : parts[0]!;
  }

  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || '');
      const parts = res.split(',');
      resolve(parts.length > 1 ? parts[1]! : parts[0]!);
    };
    reader.onerror = () => reject(new Error('Failed to read image data.'));
    reader.readAsDataURL(blob);
  });
}

export function readCardLayout(uri: string): Promise<CardLayout> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        reject(new Error('Could not measure card image'));
        return;
      }
      const aspectRatio = width / height;
      const orientation =
        aspectRatio > 1.08 ? 'landscape' : aspectRatio < 0.92 ? 'portrait' : 'square';
      resolve({ width, height, aspectRatio, orientation });
    };
    img.onerror = () => reject(new Error('Could not measure card image'));
    img.src = uri;
  });
}
