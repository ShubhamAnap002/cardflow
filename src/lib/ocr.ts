import { Platform } from 'react-native';

import type { Draft } from '@/lib/contact-draft';
import { EMPTY_DRAFT } from '@/lib/contact-draft';
import { isLocalOcrStrongEnough } from '@/lib/card-text-parse';
import { assertCanScan, getDeviceId, isPro, recordScan } from '@/lib/entitlements';
import { imageUriToBase64 } from '@/lib/media';
import { recognizeCardLocally } from '@/lib/mlkit-ocr';
import {
  clampConfidence,
  isRetryableOcrStatus,
  sleep,
  toDraftFields,
  type OcrFields,
  type OcrResult,
} from '@/lib/ocr-fields';
import { isOpenAiConfigured, scanCardWithOpenAi } from '@/lib/openai-ocr';

export type { OcrFields, OcrResult } from '@/lib/ocr-fields';
export { draftFromOcr, toDraftFields } from '@/lib/ocr-fields';

/** Public Worker URL only — OCR API key stays on Cloudflare. */
const DEFAULT_API_URL = 'https://cardflow-ocr.shubhamanap02.workers.dev';
const OCR_TIMEOUT_MS = 60_000;
const MAX_BASE64_CHARS = 5_500_000;
const MAX_ATTEMPTS = 3;

function apiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;
  return raw.replace(/\/$/, '');
}

function ocrClientKey(): string {
  return process.env.EXPO_PUBLIC_OCR_CLIENT_KEY?.trim() || '';
}

async function postScan(
  base: string,
  imageBase64: string,
  deviceId: string,
  signal: AbortSignal
): Promise<{
  ok: boolean;
  status: number;
  payload: { error?: string; fields?: Partial<OcrFields>; confidence?: number };
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-device-id': deviceId,
    'x-retry-safe': '1',
  };
  const clientKey = ocrClientKey();
  if (clientKey) headers['x-cardflow-key'] = clientKey;

  const response = await fetch(`${base}/scan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageBase64 }),
    signal,
  });

  let payload: { error?: string; fields?: Partial<OcrFields>; confidence?: number } = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error('OCR server returned an invalid response.');
  }

  return { ok: response.ok, status: response.status, payload };
}

async function scanWithCloud(uri: string): Promise<OcrResult> {
  const base = apiBaseUrl();
  if (!base) {
    throw new Error('OCR server URL is missing.');
  }

  let imageBase64: string;
  try {
    imageBase64 = await imageUriToBase64(uri);
  } catch {
    throw new Error('Could not read that photo. Try another shot.');
  }

  if (!imageBase64 || imageBase64.length < 100) {
    throw new Error('Could not read that photo. Try another shot.');
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    throw new Error('Photo is too large. Retake closer or lower quality.');
  }

  const deviceId = await getDeviceId();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
    try {
      const { ok, status, payload } = await postScan(
        base,
        imageBase64,
        deviceId,
        controller.signal
      );

      if (!ok) {
        const message = payload.error || `OCR failed (${status}).`;
        if (isRetryableOcrStatus(status) && attempt < MAX_ATTEMPTS - 1) {
          lastError = new Error(message);
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw new Error(message);
      }

      return {
        fields: toDraftFields(payload.fields),
        confidence: clampConfidence(payload.confidence),
        engine: 'cloud',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error('OCR timed out. Check your connection and try again.');
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw lastError;
      }
      if (
        error instanceof Error &&
        /network|failed to fetch|network request failed/i.test(error.message) &&
        attempt < MAX_ATTEMPTS - 1
      ) {
        lastError = error;
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error('OCR failed. Please try again.');
}

function hasAnyFields(fields: OcrFields): boolean {
  return Boolean(fields.name || fields.email || fields.phone || fields.company);
}

/**
 * Scanning priority:
 * 1. If OpenAI API key is configured (EXPO_PUBLIC_OPENAI_API_KEY in .env),
 *    use OpenAI Vision for intelligent business card scanning, full field mapping & products.
 * 2. Otherwise: on-device text recognition (fast + free on native) or Cloud Worker fallback.
 */
export async function scanCardImage(uri: string): Promise<OcrResult> {
  await assertCanScan();

  // Primary AI Engine: OpenAI Vision if key configured in .env
  if (isOpenAiConfigured()) {
    try {
      const aiResult = await scanCardWithOpenAi(uri);
      await recordScan();
      return aiResult;
    } catch (openAiError) {
      console.warn('OpenAI card scan error, falling back to standard OCR:', openAiError);
      // Fallback seamlessly to local / Cloud OCR
    }
  }

  const pro = await isPro();
  const local = await recognizeCardLocally(uri);

  // Everyone: prefer a strong on-device result (fast + free).
  if (local && isLocalOcrStrongEnough(local.fields, local.confidence)) {
    await recordScan();
    return {
      fields: local.fields,
      confidence: local.confidence,
      engine: 'mlkit',
    };
  }

  // Pro or Web: escalate to cloud when on-device result is weak or missing.
  if (pro || Platform.OS === 'web') {
    try {
      const cloud = await scanWithCloud(uri);
      await recordScan();
      return cloud;
    } catch (error) {
      if (local && hasAnyFields(local.fields)) {
        await recordScan();
        return {
          fields: local.fields,
          confidence: Math.min(local.confidence, 65),
          engine: 'mlkit',
        };
      }
      throw error;
    }
  }

  // Free: no cloud assist — return whatever on-device got, or ask to retake / upgrade.
  if (local && hasAnyFields(local.fields)) {
    await recordScan();
    return {
      fields: local.fields,
      confidence: local.confidence,
      engine: 'mlkit',
    };
  }

  throw new Error(
    'Could not read that card. Retake in better light, or upgrade to Pro for cloud assist.'
  );
}
