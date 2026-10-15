import { notify } from '@/lib/feedback';

/**
 * Share or download a PNG QR from base64 data URL on web.
 */
export async function shareQrPngBase64(
  base64: string,
  filename = 'cardflow-qr.png'
): Promise<void> {
  const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  await sharePngFile(dataUrl, filename);
}

/**
 * Share or download an existing PNG image URL or data URL on web.
 * Uses Web Share API if supported, or triggers a direct browser download.
 */
export async function sharePngFile(
  pathOrDataUrl: string,
  filename = 'cardflow.png'
): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(pathOrDataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename.replace(/\.png$/i, '') || 'Share card',
          });
          return;
        }
      } catch {
        // Fall back to direct download if sharing failed or was cancelled
      }
    }

    // Direct browser download
    const link = document.createElement('a');
    link.href = pathOrDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Image downloaded.');
  } catch {
    notify('Could not share or download the image.');
  }
}
