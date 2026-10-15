import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { getSupabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/** Deep link back into the app after Google OAuth (scheme: cardflow). */
export function authRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'cardflow',
    path: 'auth/callback',
  });
}

/** Finish OAuth from a deep-link or auth-session URL. */
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

/**
 * Opens Google via OAuth and stores the session on success.
 * Always clears any existing session first and forces the account picker
 * so a second Gmail is not silently reused.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sign-in is not configured.');

  // Drop local + server session so OAuth cannot revive the previous user.
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // continue — picker still forces a fresh choice
  }

  try {
    await WebBrowser.coolDownAsync();
  } catch {
    // optional
  }
  try {
    await WebBrowser.warmUpAsync();
  } catch {
    // optional
  }

  const redirectTo = authRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        // Force account chooser every time (do not auto-pick last Google account).
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in URL was missing.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  try {
    await WebBrowser.coolDownAsync();
  } catch {
    // optional
  }

  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }
  await completeOAuthFromUrl(result.url);
}
