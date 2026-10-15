import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEGAL_UPDATED } from '@/lib/legal-content';
import { getSupabase } from '@/lib/supabase';
import { resetDemoData } from '@/lib/storage';

const CONSENT_KEY = 'cardflow.legalConsent.v1';

export type LegalConsent = {
  acceptedAt: number;
  policyVersion: string;
};

type ConsentListener = () => void;
const consentListeners = new Set<ConsentListener>();

/** Sync cache for root gate (avoids bounce after Accept). */
let consentCached: boolean | null = null;

/** Subscribe to consent saves (so the root gate updates immediately). */
export function onLegalConsentChanged(listener: ConsentListener): () => void {
  consentListeners.add(listener);
  return () => {
    consentListeners.delete(listener);
  };
}

function emitConsentChanged() {
  consentListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function peekLegalAccepted(): boolean | null {
  return consentCached;
}

/** Clear sync cache (tests / after wiping consent key). */
export function invalidateLegalConsentCache(): void {
  consentCached = null;
}

async function getLegalConsent(): Promise<LegalConsent | null> {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LegalConsent;
  } catch {
    return null;
  }
}

export async function hasAcceptedCurrentLegal(): Promise<boolean> {
  if (consentCached !== null) return consentCached;
  const consent = await getLegalConsent();
  consentCached = Boolean(consent && consent.policyVersion === LEGAL_UPDATED);
  return consentCached;
}

export async function acceptLegal(): Promise<void> {
  const payload: LegalConsent = {
    acceptedAt: Date.now(),
    policyVersion: LEGAL_UPDATED,
  };
  await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  consentCached = true;
  emitConsentChanged();
}

/**
 * Settings “Clear local data” — contacts, groups, profile, settings only.
 * Keeps account session, Pro entitlement, OCR quota, and auth user id.
 */
export async function clearLocalUserContent(): Promise<void> {
  await resetDemoData();
  try {
    const { clearQrDraft } = await import('@/lib/qr-card');
    await clearQrDraft();
  } catch {
    // ignore
  }
  emitLocalDataChanged();
}

/**
 * Full local wipe for sign-out, account switch, and delete account.
 * Removes contacts/profile plus Pro flags, OCR usage, and auth user binding.
 */
export async function clearLocalAppData(): Promise<void> {
  await resetDemoData();
  try {
    await AsyncStorage.multiRemove([
      'cardflow.pro.v1',
      'cardflow.pro.period.v1',
      'cardflow.ocrUsage.v1',
      'cardflow.ads.interstitialSaveCount.v1',
      'cardflow.auth.userId.v1',
      'cardflow.qrDraft.v1',
    ]);
  } catch {
    // best-effort
  }
  try {
    const { clearQrDraft } = await import('@/lib/qr-card');
    await clearQrDraft();
  } catch {
    // ignore
  }
  try {
    const { resetOnboarding } = await import('@/lib/onboarding');
    await resetOnboarding();
  } catch {
    // ignore
  }
  emitLocalDataChanged();
}

type DataListener = () => void;
const dataListeners = new Set<DataListener>();

/** Subscribe when local contacts/profile/settings are wiped or reset. */
export function onLocalDataChanged(listener: DataListener): () => void {
  dataListeners.add(listener);
  return () => {
    dataListeners.delete(listener);
  };
}

function emitLocalDataChanged() {
  dataListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

/**
 * Deletes account (RPC) + clears local data + signs out.
 * Requires `delete_own_account` SQL from docs.
 * Local wipe always runs — even if the remote delete fails after sign-out.
 */
export async function deleteAccountAndLocalData(): Promise<void> {
  let remoteError: Error | null = null;
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.from('profiles').delete().eq('id', user.id);
        } catch {
          // best-effort
        }
      }
      if (error.message && !/function|schema cache|does not exist/i.test(error.message)) {
        remoteError = error;
      }
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // already signed out
    }
  }

  await clearLocalAppData();
  await AsyncStorage.removeItem(CONSENT_KEY);
  consentCached = false;
  emitConsentChanged();

  if (remoteError) throw remoteError;
}
