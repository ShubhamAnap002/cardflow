import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { getSupabase } from '@/lib/supabase';

/** Web redirect URI for Supabase Google OAuth */
export function authRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return 'http://localhost:8081/auth/callback';
}

/** Finish OAuth from redirect URL parameters on web */
export async function completeOAuthFromUrl(url: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sign-in is not configured.');

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(String(errorCode));

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  const code = params.code;

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  throw new Error('Google sign-in did not return a session.');
}

/** Web Google OAuth via Supabase browser redirect */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sign-in is not configured.');

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // continue
  }

  const redirectTo = authRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in URL was missing.');

  window.location.href = data.url;
}
