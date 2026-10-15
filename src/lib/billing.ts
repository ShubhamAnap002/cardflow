/**
 * Google Play Billing (expo-iap) — CardFlow Pro subscriptions.
 * Product IDs must match Play Console (Subscriptions, not one-time IAP).
 */
import { Linking, Platform } from 'react-native';

import {
  PRO_SUBSCRIPTION_IDS,
  PRO_SUBSCRIPTION_MONTHLY,
  PRO_SUBSCRIPTION_YEARLY,
  getProPeriod,
  isProSubscriptionId,
  setPro,
  setProPeriod,
  type ProPeriod,
} from '@/lib/entitlements';

export type PurchaseOutcome = 'purchased' | 'restored' | 'local' | 'cancelled';

const ANDROID_PACKAGE = 'com.shubhamanap.cardflow';

/** Local unlock only in Expo Go / preview when native billing is unavailable. */
export function allowLocalProUnlock(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return process.env.EXPO_PUBLIC_ALLOW_LOCAL_PRO?.trim() === '1';
}

function skuForPeriod(period: ProPeriod): string {
  return period === 'yearly' ? PRO_SUBSCRIPTION_YEARLY : PRO_SUBSCRIPTION_MONTHLY;
}

async function grantPro(period: ProPeriod, source: 'play' | 'promo' | 'admin' = 'play'): Promise<void> {
  await setPro(true);
  await setProPeriod(period);
  try {
    const { pushPlanToRemote } = await import('@/lib/profile-sync');
    await pushPlanToRemote('pro', source);
  } catch {
    // Local unlock still applies.
  }
}

async function revokeProLocal(): Promise<void> {
  await setPro(false);
  await setProPeriod(null);
  try {
    const { pushPlanToRemote } = await import('@/lib/profile-sync');
    await pushPlanToRemote('free', 'play');
  } catch {
    // ignore
  }
}

type SubProduct = {
  id?: string;
  productId?: string;
  subscriptionOffers?: { offerToken?: string | null }[] | null;
};

function productSku(p: SubProduct): string {
  return (p.id || p.productId || '').trim();
}

function offerTokenFor(product: SubProduct | undefined): string | null {
  const offers = product?.subscriptionOffers;
  if (!offers?.length) return null;
  const token = offers[0]?.offerToken;
  return token ? String(token) : null;
}

/**
 * Buy a Pro subscription (monthly or yearly) via Play Billing.
 */
export async function purchaseProFromStore(
  period: ProPeriod = 'monthly'
): Promise<PurchaseOutcome> {
  const sku = skuForPeriod(period);

  if (Platform.OS === 'web') {
    if (allowLocalProUnlock()) {
      await grantPro(period);
      return 'local';
    }
    throw new Error('Subscriptions are available on the Android app from Google Play.');
  }

  try {
    const iap = await import('expo-iap');
    await iap.initConnection();

    const products = (await iap.fetchProducts({
      skus: [...PRO_SUBSCRIPTION_IDS],
      type: 'subs',
    })) as SubProduct[] | null;

    const list = Array.isArray(products) ? products : [];
    const match = list.find((p) => productSku(p) === sku);
    if (!match) {
      throw new Error(
        `Subscription "${sku}" is not available. Create monthly/yearly subscriptions in Play Console and wait until Active.`
      );
    }

    const offerToken = offerTokenFor(match);

    const outcome = await new Promise<PurchaseOutcome>((resolve, reject) => {
      let settled = false;
      const finish = (result: PurchaseOutcome) => {
        if (settled) return;
        settled = true;
        updateSub.remove();
        errorSub.remove();
        resolve(result);
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        updateSub.remove();
        errorSub.remove();
        reject(error);
      };

      const updateSub = iap.purchaseUpdatedListener((purchase) => {
        void (async () => {
          try {
            if (!isProSubscriptionId(purchase.productId)) {
              fail(new Error('Unexpected product in purchase response.'));
              return;
            }
            await iap.finishTransaction({ purchase, isConsumable: false });
            const boughtPeriod: ProPeriod =
              purchase.productId === PRO_SUBSCRIPTION_YEARLY ? 'yearly' : 'monthly';
            await grantPro(boughtPeriod);
            finish('purchased');
          } catch (error) {
            fail(error);
          }
        })();
      });

      const errorSub = iap.purchaseErrorListener((error) => {
        if (iap.isUserCancelledError(error)) {
          finish('cancelled');
          return;
        }
        fail(
          new Error(
            iap.getUserFriendlyErrorMessage(error) || error.message || 'Purchase failed.'
          )
        );
      });

      const googleRequest: {
        skus: string[];
        subscriptionOffers?: { sku: string; offerToken: string }[];
      } = { skus: [sku] };
      if (offerToken) {
        googleRequest.subscriptionOffers = [{ sku, offerToken }];
      }

      void iap
        .requestPurchase({
          request: {
            google: googleRequest,
            apple: { sku },
          },
          type: 'subs',
        })
        .catch((error: unknown) => {
          fail(error instanceof Error ? error : new Error('Could not start purchase.'));
        });

      setTimeout(() => {
        if (!settled) fail(new Error('Purchase timed out. Try again.'));
      }, 120_000);
    });

    try {
      await iap.endConnection();
    } catch {
      // ignore
    }
    return outcome;
  } catch (error) {
    if (allowLocalProUnlock()) {
      await grantPro(period);
      return 'local';
    }
    throw error instanceof Error ? error : new Error('Purchase failed.');
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
    // Only promo/admin remote Pro should block Play revoke (not self-written play).
    return (
      row?.plan === 'pro' &&
      (row.pro_source === 'promo' || row.pro_source === 'admin')
    );
  } catch {
    return false;
  }
}

/** Restore / refresh Pro from active Play subscriptions. */
export async function restoreProFromStore(options?: {
  keepRemotePro?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const iap = await import('expo-iap');
    await iap.initConnection();

    try {
      await iap.restorePurchases();
    } catch {
      // Android mainly uses query; ignore restore helper failures.
    }

    const active = await iap.getActiveSubscriptions([...PRO_SUBSCRIPTION_IDS]);
    const list = Array.isArray(active) ? active : [];

    if (list.length === 0) {
      const keepRemote =
        options?.keepRemotePro === true ||
        (options?.keepRemotePro !== false && (await remotePlanIsPro()));
      // Do not wipe promo/admin Pro (or preview local unlock) when Play has nothing.
      if (!keepRemote && !allowLocalProUnlock()) {
        await revokeProLocal();
      }
      try {
        await iap.endConnection();
      } catch {
        // ignore
      }
      if (keepRemote) {
        const { setPro } = await import('@/lib/entitlements');
        await setPro(true);
        return true;
      }
      const { isPro } = await import('@/lib/entitlements');
      return isPro();
    }

    const yearly = list.some((s) => {
      const id =
        (s as { productId?: string }).productId || (s as { id?: string }).id || '';
      return id === PRO_SUBSCRIPTION_YEARLY;
    });
    await grantPro(yearly ? 'yearly' : 'monthly');

    try {
      await iap.endConnection();
    } catch {
      // ignore
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sync local Pro flag from Play active subscriptions.
 * Expired / cancelled subs → Free (unless local-pro preview unlock is allowed,
 * or keepRemotePro when Supabase plan is promo/admin Pro).
 */
export async function syncSubscriptionStatus(options?: {
  keepRemotePro?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const { isPro } = await import('@/lib/entitlements');
    return isPro();
  }

  try {
    const iap = await import('expo-iap');
    await iap.initConnection();
    const has = await iap.hasActiveSubscriptions([...PRO_SUBSCRIPTION_IDS]);
    if (has) {
      const ok = await restoreProFromStore();
      return ok;
    }
    if (!allowLocalProUnlock() && !options?.keepRemotePro) {
      await revokeProLocal();
    }
    try {
      await iap.endConnection();
    } catch {
      // ignore
    }
    return Boolean(options?.keepRemotePro);
  } catch {
    const { isPro } = await import('@/lib/entitlements');
    return isPro();
  }
}

/** Open Google Play subscription management for CardFlow Pro. */
export async function openSubscriptionManagement(): Promise<void> {
  const period = await getProPeriod();
  const skuAndroid = period === 'yearly' ? PRO_SUBSCRIPTION_YEARLY : PRO_SUBSCRIPTION_MONTHLY;

  try {
    const iap = await import('expo-iap');
    await iap.deepLinkToSubscriptions({
      skuAndroid,
      packageNameAndroid: ANDROID_PACKAGE,
    });
    return;
  } catch {
    // Fall through to Play Store URL.
  }

  const url = `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE}&sku=${skuAndroid}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // ignore
  }
  await Linking.openURL('https://play.google.com/store/account/subscriptions');
}
