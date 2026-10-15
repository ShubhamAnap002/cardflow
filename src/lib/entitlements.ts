import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const PRO_KEY = 'cardflow.pro.v1';
const PRO_PERIOD_KEY = 'cardflow.pro.period.v1';
const USAGE_KEY = 'cardflow.ocrUsage.v1';

/** Free tier monthly OCR allowance. */
export const FREE_SCAN_LIMIT = 15;

/** Extra scans granted per completed rewarded ad. */
export const REWARD_SCANS_PER_AD = 3;

/** Max rewarded claims per calendar month. */
export const MAX_REWARD_CLAIMS_PER_MONTH = 5;

/** Play Console subscription product IDs (must match exactly). */
export const PRO_SUBSCRIPTION_MONTHLY = 'cardflow_pro_monthly';
export const PRO_SUBSCRIPTION_YEARLY = 'cardflow_pro_yearly';
export const PRO_SUBSCRIPTION_IDS = [
  PRO_SUBSCRIPTION_MONTHLY,
  PRO_SUBSCRIPTION_YEARLY,
] as const;

export type ProPeriod = 'monthly' | 'yearly';

export type OcrUsage = {
  /** YYYY-MM */
  month: string;
  count: number;
  bonus: number;
  rewardsClaimed: number;
};

export type EntitlementState = {
  isPro: boolean;
  period: ProPeriod | null;
  usage: OcrUsage;
  remaining: number;
  limit: number;
};

export class QuotaExceededError extends Error {
  constructor() {
    super(
      `Free limit reached (${FREE_SCAN_LIMIT}/month). Watch an ad for more scans or upgrade to Pro.`
    );
    this.name = 'QuotaExceededError';
  }
}

export function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof QuotaExceededError ||
    (error instanceof Error && /free limit reached/i.test(error.message))
  );
}

export function isProSubscriptionId(productId: string | null | undefined): boolean {
  return (
    productId === PRO_SUBSCRIPTION_MONTHLY || productId === PRO_SUBSCRIPTION_YEARLY
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const id = Application.getAndroidId();
      if (id) return id;
    }
    if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync();
      if (id) return id;
    }
  } catch {
    // fall through
  }
  const fallbackKey = 'cardflow.deviceId.v1';
  let id = await AsyncStorage.getItem(fallbackKey);
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(fallbackKey, id);
  }
  return id;
}

export async function isPro(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PRO_KEY);
  return raw === '1' || raw === 'true';
}

export async function setPro(value: boolean): Promise<void> {
  await AsyncStorage.setItem(PRO_KEY, value ? '1' : '0');
  if (!value) await AsyncStorage.removeItem(PRO_PERIOD_KEY);
}

export async function getProPeriod(): Promise<ProPeriod | null> {
  const raw = await AsyncStorage.getItem(PRO_PERIOD_KEY);
  if (raw === 'monthly' || raw === 'yearly') return raw;
  return null;
}

export async function setProPeriod(period: ProPeriod | null): Promise<void> {
  if (!period) {
    await AsyncStorage.removeItem(PRO_PERIOD_KEY);
    return;
  }
  await AsyncStorage.setItem(PRO_PERIOD_KEY, period);
}

function normalizeUsage(raw: Partial<OcrUsage> | null, month: string): OcrUsage {
  if (!raw || raw.month !== month) {
    return { month, count: 0, bonus: 0, rewardsClaimed: 0 };
  }
  return {
    month,
    count: Number(raw.count) || 0,
    bonus: Number(raw.bonus) || 0,
    rewardsClaimed: Number(raw.rewardsClaimed) || 0,
  };
}

export async function getOcrUsage(): Promise<OcrUsage> {
  const month = currentMonth();
  const raw = await AsyncStorage.getItem(USAGE_KEY);
  if (!raw) return { month, count: 0, bonus: 0, rewardsClaimed: 0 };
  try {
    return normalizeUsage(JSON.parse(raw) as Partial<OcrUsage>, month);
  } catch {
    return { month, count: 0, bonus: 0, rewardsClaimed: 0 };
  }
}

async function saveUsage(usage: OcrUsage): Promise<void> {
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

function effectiveLimit(usage: OcrUsage): number {
  return FREE_SCAN_LIMIT + Math.max(0, usage.bonus);
}

export async function getEntitlementState(): Promise<EntitlementState> {
  const [pro, usage, period] = await Promise.all([isPro(), getOcrUsage(), getProPeriod()]);
  const limit = effectiveLimit(usage);
  const remaining = pro ? Number.POSITIVE_INFINITY : Math.max(0, limit - usage.count);
  return {
    isPro: pro,
    period: pro ? period : null,
    usage,
    remaining: Number.isFinite(remaining) ? remaining : limit,
    limit: pro ? FREE_SCAN_LIMIT : limit,
  };
}

export async function assertCanScan(): Promise<EntitlementState> {
  const state = await getEntitlementState();
  if (state.isPro) return state;
  if (state.usage.count >= effectiveLimit(state.usage)) {
    throw new QuotaExceededError();
  }
  return state;
}

export async function recordScan(): Promise<EntitlementState> {
  const pro = await isPro();
  if (pro) return getEntitlementState();
  const usage = await getOcrUsage();
  const next: OcrUsage = {
    month: usage.month,
    count: usage.count + 1,
    bonus: usage.bonus,
    rewardsClaimed: usage.rewardsClaimed,
  };
  await saveUsage(next);
  try {
    const { pushOcrUsageToRemote } = await import('@/lib/profile-sync');
    void pushOcrUsageToRemote(next.month, next.count);
  } catch {
    // Local quota remains source of truth if remote sync fails.
  }
  return getEntitlementState();
}

export async function canClaimRewardedScans(): Promise<boolean> {
  if (await isPro()) return false;
  const usage = await getOcrUsage();
  return usage.rewardsClaimed < MAX_REWARD_CLAIMS_PER_MONTH;
}

export async function grantRewardedScans(): Promise<EntitlementState> {
  if (!(await canClaimRewardedScans())) {
    throw new Error('No more rewarded scans this month.');
  }
  const usage = await getOcrUsage();
  const next: OcrUsage = {
    month: usage.month,
    count: usage.count,
    bonus: usage.bonus + REWARD_SCANS_PER_AD,
    rewardsClaimed: usage.rewardsClaimed + 1,
  };
  await saveUsage(next);
  return getEntitlementState();
}

/** Start Pro subscription purchase (monthly or yearly). */
export async function purchasePro(period: ProPeriod = 'monthly'): Promise<boolean> {
  const { purchaseProFromStore } = await import('@/lib/billing');
  const outcome = await purchaseProFromStore(period);
  if (outcome === 'cancelled') {
    throw new Error('Purchase cancelled.');
  }
  return outcome === 'purchased' || outcome === 'restored' || outcome === 'local';
}

export async function restorePurchases(): Promise<boolean> {
  const { restoreProFromStore } = await import('@/lib/billing');
  return restoreProFromStore();
}

export async function openManageSubscriptions(): Promise<void> {
  const { openSubscriptionManagement } = await import('@/lib/billing');
  await openSubscriptionManagement();
}
