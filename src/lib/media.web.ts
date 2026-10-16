export type CardLayout = {
  width: number;
  height: number;
  /** width / height */
  aspectRatio: number;
  orientation: 'landscape' | 'portrait' | 'square';
};

const STAGED_IMAGE_KEY = 'cardflow.stagedCardImage.v1';
let memoryCardImage: string | null = null;

/**
 * Stage captured card image in memory / sessionStorage for Review screen navigation on Web.
 * This completely prevents passing multi-megabyte base64 strings in URL query parameters.
 */
export async function stageCardImageForReview(uri: string): Promise<void> {
  memoryCardImage = uri;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STAGED_IMAGE_KEY, uri);
    }
  } catch {
    // sessionStorage quota exceeded, memoryCardImage is retained
  }
}

/** Read staged card image for Review screen on Web. */
export async function readStagedCardImage(): Promise<string | null> {
  if (memoryCardImage) return memoryCardImage;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(STAGED_IMAGE_KEY);
      if (stored) return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Clear staged card image once review form is saved or abandoned. */
export async function clearStagedCardImage(): Promise<void> {
  memoryCardImage = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STAGED_IMAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Resize and compress image on web before base64 encoding.
 * Prevents oversized base64 strings, network timeouts, and browser memory crashes.
 */
export async function compressImageWeb(
  uri: string,
  maxDimension = 1600,
  quality = 0.85
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return uri;
  }

  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve(uri);
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(uri);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch {
        resolve(uri);
      }
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

/**
 * On web, convert blob: URIs to base64 data URLs with compression so they persist in AsyncStorage.
 */
export async function persistCardImage(uri: string): Promise<string> {
  if (!uri) return uri;
  try {
    const compressed = await compressImageWeb(uri);
    if (compressed.startsWith('data:')) return compressed;
    const base64 = await imageUriToBase64(compressed);
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    if (uri.startsWith('data:')) return uri;
    try {
      const base64 = await imageUriToBase64(uri);
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      return uri;
    }
  }
}

/** Read image bytes as base64 (no data: prefix) using browser FileReader / fetch. */
export async function imageUriToBase64(uri: string): Promise<string> {
  if (!uri) return '';

  if (uri.startsWith('data:')) {
    const parts = uri.split(',');
    let raw = parts.length > 1 ? parts[1]! : parts[0]!;
    // Fix corrupted base64 where + was turned into spaces during query string decoding
    if (raw.includes(' ') && !raw.includes('+')) {
      raw = raw.replace(/ /g, '+');
    }
    return raw;
  }

  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || '');
      const parts = res.split(',');
      let raw = parts.length > 1 ? parts[1]! : parts[0]!;
      if (raw.includes(' ') && !raw.includes('+')) {
        raw = raw.replace(/ /g, '+');
      }
      resolve(raw);
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
