import type { OcrFields } from '@/lib/ocr-fields';

export type LocalOcrResult = {
  fields: OcrFields;
  confidence: number;
  rawText: string;
};

/**
 * On-device ML Kit OCR is native-only (Android/iOS).
 * On web, returns null so caller delegates to cloud OCR worker.
 */
export async function recognizeCardLocally(_uri: string): Promise<LocalOcrResult | null> {
  return null;
}
