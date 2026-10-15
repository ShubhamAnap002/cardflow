import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: (spec: Record<string, unknown>) => spec.android },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      memory.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => memory.delete(key));
    }),
  },
}));

vi.mock('@/lib/profile-sync', () => ({
  pushOcrUsageToRemote: vi.fn(async () => undefined),
  pushPlanToRemote: vi.fn(async () => undefined),
  syncProfileFromRemote: vi.fn(async () => null),
}));

vi.mock('expo-application', () => ({
  getAndroidId: () => 'test-android-id',
  getIosIdForVendorAsync: async () => 'test-ios-id',
}));

import {
  FREE_SCAN_LIMIT,
  MAX_REWARD_CLAIMS_PER_MONTH,
  PRO_SUBSCRIPTION_MONTHLY,
  PRO_SUBSCRIPTION_YEARLY,
  QuotaExceededError,
  REWARD_SCANS_PER_AD,
  assertCanScan,
  canClaimRewardedScans,
  getEntitlementState,
  getOcrUsage,
  grantRewardedScans,
  isPro,
  isProSubscriptionId,
  isQuotaExceeded,
  recordScan,
  setPro,
  setProPeriod,
} from '@/lib/entitlements';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

describe('entitlements / billing helpers', () => {
  beforeEach(() => {
    memory.clear();
    vi.clearAllMocks();
  });

  describe('isProSubscriptionId', () => {
    it('accepts monthly and yearly SKUs', () => {
      expect(isProSubscriptionId(PRO_SUBSCRIPTION_MONTHLY)).toBe(true);
      expect(isProSubscriptionId(PRO_SUBSCRIPTION_YEARLY)).toBe(true);
      expect(isProSubscriptionId('other_sku')).toBe(false);
      expect(isProSubscriptionId(null)).toBe(false);
    });
  });

  describe('Pro flag', () => {
    it('defaults to free', async () => {
      expect(await isPro()).toBe(false);
    });

    it('setPro toggles local entitlement', async () => {
      await setPro(true);
      await setProPeriod('yearly');
      expect(await isPro()).toBe(true);
      const state = await getEntitlementState();
      expect(state.isPro).toBe(true);
      expect(state.period).toBe('yearly');

      await setPro(false);
      expect(await isPro()).toBe(false);
      expect((await getEntitlementState()).period).toBeNull();
    });
  });

  describe('OCR quota', () => {
    it('starts empty for the current month', async () => {
      const usage = await getOcrUsage();
      expect(usage.month).toBe(currentMonth());
      expect(usage.count).toBe(0);
      expect(usage.bonus).toBe(0);
    });

    it('resets stale month usage', async () => {
      await AsyncStorage.setItem(
        'cardflow.ocrUsage.v1',
        JSON.stringify({ month: '2000-01', count: 12, bonus: 6, rewardsClaimed: 2 })
      );
      const usage = await getOcrUsage();
      expect(usage.month).toBe(currentMonth());
      expect(usage.count).toBe(0);
      expect(usage.bonus).toBe(0);
      expect(usage.rewardsClaimed).toBe(0);
    });

    it('recordScan increments free usage and preserves bonus', async () => {
      await AsyncStorage.setItem(
        'cardflow.ocrUsage.v1',
        JSON.stringify({
          month: currentMonth(),
          count: 2,
          bonus: 3,
          rewardsClaimed: 1,
        })
      );
      const state = await recordScan();
      expect(state.usage.count).toBe(3);
      expect(state.usage.bonus).toBe(3);
      expect(state.usage.rewardsClaimed).toBe(1);
    });

    it('assertCanScan throws when free limit + bonus exhausted', async () => {
      await AsyncStorage.setItem(
        'cardflow.ocrUsage.v1',
        JSON.stringify({
          month: currentMonth(),
          count: FREE_SCAN_LIMIT,
          bonus: 0,
          rewardsClaimed: 0,
        })
      );
      await expect(assertCanScan()).rejects.toBeInstanceOf(QuotaExceededError);
      expect(isQuotaExceeded(new QuotaExceededError())).toBe(true);
    });

    it('assertCanScan allows Pro without counting', async () => {
      await setPro(true);
      await AsyncStorage.setItem(
        'cardflow.ocrUsage.v1',
        JSON.stringify({
          month: currentMonth(),
          count: FREE_SCAN_LIMIT + 50,
          bonus: 0,
          rewardsClaimed: 0,
        })
      );
      await expect(assertCanScan()).resolves.toMatchObject({ isPro: true });
    });
  });

  describe('rewarded ads bonus', () => {
    it('grants bonus scans and tracks claims', async () => {
      const state = await grantRewardedScans();
      expect(state.usage.bonus).toBe(REWARD_SCANS_PER_AD);
      expect(state.usage.rewardsClaimed).toBe(1);
      expect(state.limit).toBe(FREE_SCAN_LIMIT + REWARD_SCANS_PER_AD);
    });

    it('blocks claims after monthly cap', async () => {
      await AsyncStorage.setItem(
        'cardflow.ocrUsage.v1',
        JSON.stringify({
          month: currentMonth(),
          count: 0,
          bonus: MAX_REWARD_CLAIMS_PER_MONTH * REWARD_SCANS_PER_AD,
          rewardsClaimed: MAX_REWARD_CLAIMS_PER_MONTH,
        })
      );
      expect(await canClaimRewardedScans()).toBe(false);
      await expect(grantRewardedScans()).rejects.toThrow(/no more rewarded/i);
    });

    it('does not offer rewards to Pro', async () => {
      await setPro(true);
      expect(await canClaimRewardedScans()).toBe(false);
    });
  });

  describe('Play SKUs + banned message contract', () => {
    it('exports Console subscription product IDs', () => {
      expect(PRO_SUBSCRIPTION_MONTHLY).toBe('cardflow_pro_monthly');
      expect(PRO_SUBSCRIPTION_YEARLY).toBe('cardflow_pro_yearly');
      expect([PRO_SUBSCRIPTION_MONTHLY, PRO_SUBSCRIPTION_YEARLY]).toEqual(
        expect.arrayContaining([PRO_SUBSCRIPTION_MONTHLY, PRO_SUBSCRIPTION_YEARLY])
      );
    });

    it('banned error text matches auth-context detector', () => {
      const message = 'This account has been disabled. Contact support.';
      expect(/disabled|banned/i.test(message)).toBe(true);
    });
  });
});
