import { Platform } from 'react-native';

import {
  estimateLocalOcrConfidence,
  parseBusinessCardText,
} from '@/lib/card-text-parse';
import type { OcrFields } from '@/lib/ocr-fields';

export type LocalOcrResult = {
  fields: OcrFields;
  confidence: number;
  rawText: string;
};

/**
 * On-device ML Kit OCR. Returns null if the native module is missing (Expo Go)
 * or recognition fails — caller should fall back to Gemini.
 */
export async function recognizeCardLocally(uri: string): Promise<LocalOcrResult | null> {
  if (Platform.OS === 'web') return null;

  try {
    const TextRecognition = (await import('@react-native-ml-kit/text-recognition')).default;
    const result = await TextRecognition.recognize(uri);
    const rawText = String(result?.text || '').trim();
    if (rawText.length < 8) return null;

    const fields = parseBusinessCardText(rawText);
    const confidence = estimateLocalOcrConfidence(fields, rawText);
    return { fields, confidence, rawText };
  } catch {
    return null;
  }
}
