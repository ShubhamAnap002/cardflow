/**
 * Web implementation of billing — replaces native expo-iap on web.
 * Syncs seamlessly with Supabase profile plan and local dev/preview unlock.
 */
import {
  setPro,
  setProPeriod,
  type ProPeriod,
} from '@/lib/entitlements';

export type PurchaseOutcome = 'purchased' | 'restored' | 'local' | 'cancelled';

/** Local unlock in dev / preview or when EXPO_PUBLIC_ALLOW_LOCAL_PRO is set. */
export function allowLocalProUnlock(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return process.env.EXPO_PUBLIC_ALLOW_LOCAL_PRO?.trim() === '1';
}

async function grantPro(
  period: ProPeriod,
  source: 'play' | 'promo' | 'admin' = 'promo'
): Promise<void> {
  await setPro(true);
  await setProPeriod(period);
  try {
    const { pushPlanToRemote } = await import('@/lib/profile-sync');
    await pushPlanToRemote('pro', source);
  } catch {
    // Local unlock still applies
  }
}

async function remotePlanIsPro(): Promise<boolean> {
  try {
    const { getSupabase } = await import('@/lib/supabase');
    const supabase = getSupabase();
    if (!supabase) return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('profiles')
      .select('plan,pro_source')
      .eq('id', user.id)
      .maybeSingle();
    const row = data as { plan?: string; pro_source?: string | null } | null;
    return row?.plan === 'pro';
  } catch {
    return false;
  }
}

/**
 * On web: if dev / preview unlock allowed, unlock Pro.
 * Otherwise, explain that Google Play subscription is linked through the Android app.
 */
export async function purchaseProFromStore(
  period: ProPeriod = 'monthly'
): Promise<PurchaseOutcome> {
  if (allowLocalProUnlock()) {
    await grantPro(period, 'promo');
    return 'local';
  }
  throw new Error(
    'CardFlow Pro subscriptions can be activated on the Android app from Google Play, or via account entitlement.'
  );
}

/** Restore / refresh Pro status from Supabase remote profile on web. */
export async function restoreProFromStore(options?: {
  keepRemotePro?: boolean;
}): Promise<boolean> {
  try {
    const isRemotePro = await remotePlanIsPro();
    if (isRemotePro) {
      await grantPro('monthly', 'promo');
      return true;
    }
    if (allowLocalProUnlock()) {
      const { isPro } = await import('@/lib/entitlements');
      return isPro();
    }
    const { isPro } = await import('@/lib/entitlements');
    return isPro();
  } catch {
    return false;
  }
}

/** Sync local Pro status from Supabase on web. */
export async function syncSubscriptionStatus(options?: {
  keepRemotePro?: boolean;
}): Promise<boolean> {
  try {
    const isRemotePro = await remotePlanIsPro();
    if (isRemotePro) {
      const { setPro } = await import('@/lib/entitlements');
      await setPro(true);
      return true;
    }
    const { isPro } = await import('@/lib/entitlements');
    return isPro();
  } catch {
    const { isPro } = await import('@/lib/entitlements');
    return isPro();
  }
}

export async function openSubscriptionManagement(): Promise<void> {
  window.open(
    'https://play.google.com/store/account/subscriptions',
    '_blank',
    'noopener,noreferrer'
  );
}
