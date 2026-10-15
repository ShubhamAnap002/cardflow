/**
 * Web implementation of ads — replaces react-native-google-mobile-ads on web.
 * Completely safe for browser execution (no native codegenNativeComponent imports).
 */
import {
  canClaimRewardedScans,
  grantRewardedScans,
  isPro,
  REWARD_SCANS_PER_AD,
} from '@/lib/entitlements';

export async function initAds(): Promise<void> {
  // No-op on web
}

export async function getBannerExports() {
  return {
    BannerAd: null,
    BannerAdSize: {},
    TestIds: { BANNER: '' },
  };
}

export function getBannerUnitId(_TestIds: { BANNER: string }): string {
  return '';
}

export async function maybeShowInterstitial(): Promise<void> {
  // No interstitial ads on web
}

export type RewardedResult =
  | { ok: true; scansAdded: number }
  | { ok: false; reason: 'pro' | 'cap' | 'cancelled' | 'error' };

/**
 * On web, rewarded ads can be simulated or grant scans in preview/dev if quota exhausted.
 */
export async function showRewardedForScans(): Promise<RewardedResult> {
  if (await isPro()) return { ok: false, reason: 'pro' };
  if (!(await canClaimRewardedScans())) return { ok: false, reason: 'cap' };

  try {
    // In web environment, grant the rewarded scans directly
    await grantRewardedScans();
    return { ok: true, scansAdded: REWARD_SCANS_PER_AD };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
