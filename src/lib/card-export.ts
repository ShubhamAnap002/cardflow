import type { ElementRef, RefObject } from 'react';
import { InteractionManager, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { notify } from '@/lib/feedback';
import { sharePngFile } from '@/lib/qr-share';

export type ExportCardViewRef = ElementRef<typeof View>;

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 40);
        });
      });
    });
  });
}

export async function shareExportCardImage(
  cardRef: RefObject<ExportCardViewRef | null>,
  filename = 'cardflow-card.png'
): Promise<void> {
  const node = cardRef.current;
  if (!node) {
    notify('Card is not ready yet. Try again in a moment.');
    return;
  }
  try {
    await waitForPaint();
    const uri = await captureRef(node, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    await sharePngFile(uri, filename);
  } catch {
    notify('Could not share the card image.');
  }
}
