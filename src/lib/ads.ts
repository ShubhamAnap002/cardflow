/**
 * AdMob helpers — loaded dynamically so Expo Go / web do not crash on import.
 *
 * Formats in use (free plan only; Pro = no ads):
 * - Banner — Home
 * - Interstitial — after a successful contact save (skip first 3, then cooldown)
 * - Rewarded — optional +N OCR scans when free quota is exhausted
 * (No app-open ads.)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  canClaimRewardedScans,
  grantRewardedScans,
  isPro,
  REWARD_SCANS_PER_AD,
} from '@/lib/entitlements';

const INTERSTITIAL_LAST_KEY = 'cardflow.ads.interstitialLast.v1';
const INTERSTITIAL_SAVE_COUNT_KEY = 'cardflow.ads.interstitialSaveCount.v1';
/** Free plan: no interstitial for the first N successful contact saves. */
const INTERSTITIAL_FREE_SKIP_SAVES = 3;
/** Minimum gap between interstitials so saves stay usable. */
const INTERSTITIAL_COOLDOWN_MS = 90_000;

export async function initAds(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const mobileAds = (await import('react-native-google-mobile-ads')).default;
    await mobileAds().initialize();
  } catch {
    // Native module unavailable
  }
}

export async function getBannerExports() {
  const mod = await import('react-native-google-mobile-ads');
  return {
    BannerAd: mod.BannerAd,
    BannerAdSize: mod.BannerAdSize,
    TestIds: mod.TestIds,
  };
}

export function getBannerUnitId(TestIds: { BANNER: string }): string {
  return process.env.EXPO_PUBLIC_ADMOB_BANNER_ID?.trim() || TestIds.BANNER;
}

function getInterstitialUnitId(TestIds: { INTERSTITIAL: string }): string {
  return process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID?.trim() || TestIds.INTERSTITIAL;
}

function getRewardedUnitId(TestIds: { REWARDED: string }): string {
  return process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID?.trim() || TestIds.REWARDED;
}

async function interstitialCooldownOk(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(INTERSTITIAL_LAST_KEY);
    if (!raw) return true;
    const last = Number(raw);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last >= INTERSTITIAL_COOLDOWN_MS;
  } catch {
    return true;
  }
}

async function markInterstitialShown(): Promise<void> {
  await AsyncStorage.setItem(INTERSTITIAL_LAST_KEY, String(Date.now()));
}

/** Persist + return successful free-plan save count (1-based after each call). */
async function recordSuccessfulSaveForInterstitial(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(INTERSTITIAL_SAVE_COUNT_KEY);
    const prev = Number(raw);
    const next = (Number.isFinite(prev) ? prev : 0) + 1;
    await AsyncStorage.setItem(INTERSTITIAL_SAVE_COUNT_KEY, String(next));
    return next;
  } catch {
    // Prefer showing ads over an unbounded free skip if storage fails.
    return INTERSTITIAL_FREE_SKIP_SAVES + 1;
  }
}

/**
 * Full-screen ad after a successful save — never mid-OCR or mid-form.
 * Free: skips the first 3 successful saves, then respects cooldown.
 * Pro: never shown.
 */
export async function maybeShowInterstitial(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (await isPro()) return;

  const saveCount = await recordSuccessfulSaveForInterstitial();
  if (saveCount <= INTERSTITIAL_FREE_SKIP_SAVES) return;

  if (!(await interstitialCooldownOk())) return;

  try {
    const mod = await import('react-native-google-mobile-ads');
    const unit = getInterstitialUnitId(mod.TestIds);
    const interstitial = mod.InterstitialAd.createForAdRequest(unit, {
      requestNonPersonalizedAdsOnly: true,
    });

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        loadedSub();
        closedSub();
        errorSub();
        resolve();
      };
      const loadedSub = interstitial.addAdEventListener(mod.AdEventType.LOADED, () => {
        void markInterstitialShown();
        void interstitial.show();
      });
      const closedSub = interstitial.addAdEventListener(mod.AdEventType.CLOSED, done);
      const errorSub = interstitial.addAdEventListener(mod.AdEventType.ERROR, done);
      interstitial.load();
      const timer = setTimeout(done, 4000);
    });
  } catch {
    // no-op
  }
}

export type RewardedResult =
  | { ok: true; scansAdded: number }
  | { ok: false; reason: 'pro' | 'cap' | 'cancelled' | 'error' };

/**
 * Shows a rewarded ad; on earn-reward, grants bonus OCR scans for the month.
 */
export async function showRewardedForScans(): Promise<RewardedResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'error' };
  if (await isPro()) return { ok: false, reason: 'pro' };
  if (!(await canClaimRewardedScans())) return { ok: false, reason: 'cap' };

  try {
    await initAds();
    const mod = await import('react-native-google-mobile-ads');
    const unit = getRewardedUnitId(mod.TestIds);
    const rewarded = mod.RewardedAd.createForAdRequest(unit, {
      requestNonPersonalizedAdsOnly: true,
    });

    let earned = false;

    const outcome = await new Promise<'earned' | 'closed' | 'error'>((resolve) => {
      const finish = (result: 'earned' | 'closed' | 'error') => resolve(result);

      rewarded.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
        void rewarded.show();
      });
      rewarded.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      rewarded.addAdEventListener(mod.AdEventType.CLOSED, () => {
        finish(earned ? 'earned' : 'closed');
      });
      rewarded.addAdEventListener(mod.AdEventType.ERROR, () => finish('error'));
      rewarded.load();
      setTimeout(() => finish('error'), 12_000);
    });

    if (outcome !== 'earned') {
      return { ok: false, reason: outcome === 'closed' ? 'cancelled' : 'error' };
    }

    await grantRewardedScans();
    return { ok: true, scansAdded: REWARD_SCANS_PER_AD };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
