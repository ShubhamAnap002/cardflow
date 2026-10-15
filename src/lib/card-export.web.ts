import type { ElementRef, RefObject } from 'react';
import { View } from 'react-native';

import { notify } from '@/lib/feedback';
import { sharePngFile } from '@/lib/qr-share';

export type ExportCardViewRef = ElementRef<typeof View>;

function rasterizeDomNode(node: HTMLElement): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const rect = node.getBoundingClientRect();
      const width = Math.round(rect.width) || 344;
      const height = Math.round(rect.height) || 152;

      // Extract styles and inner HTML
      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.position = 'static';

      const serialized = new XMLSerializer().serializeToString(clone);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<foreignObject width="100%" height="100%">${serialized}</foreignObject>` +
        `</svg>`;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = 2; // High-res export
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
          return;
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        // Fallback: check if an inner SVG exists
        const innerSvg = node.querySelector('svg');
        if (innerSvg) {
          const svgStr = new XMLSerializer().serializeToString(innerSvg);
          resolve('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr));
        } else {
          reject(new Error('Card rasterization failed'));
        }
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch (err) {
      reject(err);
    }
  });
}

export async function shareExportCardImage(
  cardRef: RefObject<ExportCardViewRef | null>,
  filename = 'cardflow-card.png'
): Promise<void> {
  const node = cardRef.current as unknown as HTMLElement | null;
  if (!node) {
    notify('Card is not ready yet. Try again in a moment.');
    return;
  }
  try {
    const dataUrl = await rasterizeDomNode(node);
    await sharePngFile(dataUrl, filename);
  } catch {
    notify('Could not export the card image.');
  }
}
