import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { FREE_SCAN_LIMIT, getOcrUsage, setPro } from '@/lib/entitlements';
import { getSupabase, PROFILE_SELECT, type RemoteProfile } from '@/lib/supabase';

const USAGE_KEY = 'cardflow.ocrUsage.v1';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Mirror remote OCR count locally without wiping rewarded-ad bonus / claim caps. */
async function writeLocalUsage(month: string, count: number) {
  const existing = await getOcrUsage();
  const sameMonth = existing.month === month;
  await AsyncStorage.setItem(
    USAGE_KEY,
    JSON.stringify({
      month,
      count,
      bonus: sameMonth ? existing.bonus : 0,
      rewardsClaimed: sameMonth ? existing.rewardsClaimed : 0,
    })
  );
}

function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/** Fetch or create the profiles row and mirror plan + OCR quota locally. */
export async function syncProfileFromRemote(
  userId: string,
  email?: string | null
): Promise<RemoteProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    console.warn('profiles fetch failed', fetchError.message);
    // Do not upsert on fetch failure — that can wipe display_name on conflict.
    return null;
  }

  let profile = existing as RemoteProfile | null;

  if (!profile) {
    const month = currentMonth();
    let metaName: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      metaName =
        (user?.user_metadata?.full_name as string | undefined)?.trim() ||
        (user?.user_metadata?.name as string | undefined)?.trim() ||
        (user?.user_metadata?.display_name as string | undefined)?.trim() ||
        null;
    } catch {
      // optional
    }

    const insert = {
      id: userId,
      email: email ?? null,
      display_name: metaName,
      plan: 'free' as const,
      ocr_month: month,
      ocr_count: 0,
      scan_total: 0,
      status: 'active' as const,
      app_version: appVersion(),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert only — never upsert null display_name over an existing row.
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert(insert)
      .select(PROFILE_SELECT)
      .single();

    if (insertError) {
      // Race: row created elsewhere — re-fetch instead of overwriting.
      const { data: again } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .maybeSingle();
      profile = again as RemoteProfile | null;
      if (!profile) {
        console.warn('profiles create failed', insertError.message);
        return null;
      }
    } else {
      profile = created as RemoteProfile;
    }
  }

  if (profile.status === 'banned') {
    await supabase.auth.signOut();
    throw new Error('This account has been disabled. Contact support.');
  }

  // Only promo/admin Pro from Supabase unlocks locally. Play Pro comes from Play Billing.
  if (
    profile.plan === 'pro' &&
    (profile.pro_source === 'admin' || profile.pro_source === 'promo')
  ) {
    await setPro(true);
  }

  const month =
    profile.ocr_month && profile.ocr_month === currentMonth()
      ? profile.ocr_month
      : currentMonth();
  // Remote OCR count can only inform — never lower local usage (anti-cheat if row was tampered).
  const remoteCount =
    profile.ocr_month === currentMonth() ? Number(profile.ocr_count) || 0 : 0;
  const local = await getOcrUsage();
  const count =
    local.month === month ? Math.max(local.count, remoteCount) : remoteCount;
  await writeLocalUsage(month, count);

  const patch: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
    app_version: appVersion(),
    updated_at: new Date().toISOString(),
  };
  // Month rollover / OCR writes go through bump_own_ocr_usage RPC (privileged).
  if (email && email !== profile.email) {
    patch.email = email;
  }

  // Backfill display name from Google / OAuth metadata when empty.
  if (!profile.display_name) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const metaName =
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      (user?.user_metadata?.display_name as string | undefined);
    if (metaName?.trim()) {
      patch.display_name = metaName.trim();
      profile = { ...profile, display_name: metaName.trim() };
    }
  }

  await supabase.from('profiles').update(patch).eq('id', userId);

  return profile;
}

export async function pushPlanToRemote(
  plan: 'free' | 'pro',
  _source: 'play' | 'promo' | 'admin' = 'play'
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  // Client can only mark Play-sourced plan via privileged RPC (trigger blocks raw updates).
  const { error } = await supabase.rpc('set_own_play_plan', { p_plan: plan });
  if (error) {
    console.warn('set_own_play_plan failed', error.message);
  }
}

/** Push local OCR usage after a successful scan (v1 soft sync). */
export async function pushOcrUsageToRemote(month: string, count: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc('bump_own_ocr_usage', {
    p_month: month,
    p_count: Math.min(count, FREE_SCAN_LIMIT * 20),
  });
  if (error) {
    console.warn('bump_own_ocr_usage failed', error.message);
  }
}
