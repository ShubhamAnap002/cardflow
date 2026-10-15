import { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearLocalAppData } from '@/lib/consent';
import { authRedirectUri, signInWithGoogle as googleOAuth } from '@/lib/google-auth';
import { syncProfileFromRemote } from '@/lib/profile-sync';
import { getSupabase, isSupabaseConfigured, type RemoteProfile } from '@/lib/supabase';

const AUTH_USER_KEY = 'cardflow.auth.userId.v1';
const GUEST_FLAG_KEY = 'cardflow.auth.isGuest.v1';

function createGuestSession(): { session: Session; profile: RemoteProfile } {
  const user: User = {
    id: 'guest_user_web',
    app_metadata: {},
    user_metadata: { full_name: 'Guest User' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'guest@cardflow.local',
    phone: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  };
  const session: Session = {
    access_token: 'mock-guest-token',
    refresh_token: 'mock-guest-refresh',
    expires_in: 3600 * 24 * 365,
    token_type: 'bearer',
    user,
  };
  const profile: RemoteProfile = {
    id: user.id,
    email: user.email ?? null,
    display_name: 'Guest User',
    plan: 'pro',
    ocr_month: null,
    ocr_count: 0,
    status: 'active',
  };
  return { session, profile };
}

export type SignUpResult = {
  /** True when the user must confirm email before signing in. */
  needsEmailVerification: boolean;
  email: string;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: RemoteProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<SignUpResult>;
  resendSignupEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Load Supabase session + run applySession (wipe / banned / profile). */
  hydrateSession: () => Promise<Session | null>;
  /** Bypass sign-in for testing, guest demo, or web preview without OAuth */
  bypassSignIn: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(error: { message: string }): Error {
  const msg = error.message || 'Something went wrong.';
  if (/email not confirmed/i.test(msg)) {
    return new Error('Verify your email first. Open the link we sent, then sign in here.');
  }
  if (/invalid login credentials/i.test(msg)) {
    return new Error('Incorrect email or password.');
  }
  if (/user already registered/i.test(msg)) {
    return new Error('That email is already registered. Sign in instead.');
  }
  return new Error(msg);
}

function isAccountDisabledError(error: unknown): boolean {
  return error instanceof Error && /disabled|banned/i.test(error.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<RemoteProfile | null>(null);

  const applySession = useCallback(async (next: Session | null) => {
    if (!next?.user) {
      setProfile(null);
      setSession(null);
      return;
    }

    // Wipe BEFORE exposing the new session so tabs never briefly show the
    // previous account's contacts/profile.
    try {
      const previousId = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (previousId && previousId !== next.user.id) {
        await clearLocalAppData();
      }
      await AsyncStorage.setItem(AUTH_USER_KEY, next.user.id);
    } catch {
      // best-effort
    }

    // Sync profile BEFORE setSession so banned accounts never appear signed-in.
    let remote: RemoteProfile | null = null;
    try {
      remote = await syncProfileFromRemote(next.user.id, next.user.email);
    } catch (error) {
      setProfile(null);
      setSession(null);
      try {
        await AsyncStorage.removeItem(AUTH_USER_KEY);
      } catch {
        // ignore
      }
      console.warn('applySession', error);
      // Let signIn / Google show “account disabled”; background listeners swallow.
      if (isAccountDisabledError(error)) throw error;
      return;
    }

    setSession(next);
    setProfile(remote);

    // Without a remote profile, skip Play revoke — keepRemotePro context is unknown
    // (offline / transient), so we must not strip local Pro.
    if (!remote) return;

    // Reconcile Play subscriptions. Keep remote promo/admin Pro if no Play sub.
    try {
      const { syncSubscriptionStatus } = await import('@/lib/billing');
      await syncSubscriptionStatus({
        keepRemotePro:
          remote.plan === 'pro' &&
          (remote.pro_source === 'admin' || remote.pro_source === 'promo'),
      });
    } catch {
      // offline / billing unavailable
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      if (data.session) {
        void applySession(data.session).finally(() => {
          if (alive) setLoading(false);
        });
      } else {
        try {
          const isGuest = await AsyncStorage.getItem(GUEST_FLAG_KEY);
          if (isGuest === '1' && alive) {
            const guest = createGuestSession();
            setSession(guest.session);
            setProfile(guest.profile);
          }
        } catch {
          // ignore
        }
        if (alive) setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void applySession(next).catch(() => undefined);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [configured, applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Sign-in is not configured.');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw friendlyAuthError(error);
      if (data.session) {
        await applySession(data.session);
      }
    },
    [applySession]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string): Promise<SignUpResult> => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Sign-in is not configured.');

      const trimmed = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: {
          emailRedirectTo: authRedirectUri(),
          data: { display_name: displayName?.trim() || undefined },
        },
      });
      if (error) throw friendlyAuthError(error);

      const identities = data.user?.identities ?? [];
      if (data.user && identities.length === 0) {
        throw new Error('That email is already registered. Sign in instead.');
      }

      const needsEmailVerification = !data.session;

      if (data.session && data.user) {
        const remote = await syncProfileFromRemote(data.user.id, data.user.email);
        if (remote && displayName?.trim()) {
          await supabase
            .from('profiles')
            .update({
              display_name: displayName.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);
        }
      }

      return { needsEmailVerification, email: trimmed };
    },
    []
  );

  const resendSignupEmail = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Sign-in is not configured.');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUri() },
    });
    if (error) throw friendlyAuthError(error);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await googleOAuth();
    const supabase = getSupabase();
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await applySession(session);
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    // Wipe first (emits onboarding reset) so the root gate never keeps a stale “done” flag.
    try {
      await AsyncStorage.removeItem(GUEST_FLAG_KEY);
      await clearLocalAppData();
    } catch {
      // best-effort
    }
    setSession(null);
    setProfile(null);
    if (!supabase) return;
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      // offline / already signed out
    }
  }, []);

  const bypassSignIn = useCallback(async () => {
    const guest = createGuestSession();
    try {
      await AsyncStorage.setItem(GUEST_FLAG_KEY, '1');
      await AsyncStorage.setItem(AUTH_USER_KEY, guest.session.user.id);
      const { acceptLegal } = await import('@/lib/consent');
      await acceptLegal();
      const { completeOnboarding } = await import('@/lib/onboarding');
      await completeOnboarding();
    } catch {
      // ignore
    }
    setSession(guest.session);
    setProfile(guest.profile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const remote = await syncProfileFromRemote(session.user.id, session.user.email);
    setProfile(remote);
  }, [session]);

  const hydrateSession = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return null;
    const {
      data: { session: next },
    } = await supabase.auth.getSession();
    if (!next) {
      setSession(null);
      setProfile(null);
      return null;
    }
    await applySession(next);
    return next;
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signUp,
      resendSignupEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
      hydrateSession,
      bypassSignIn,
    }),
    [
      configured,
      loading,
      session,
      profile,
      signIn,
      signUp,
      resendSignupEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
      hydrateSession,
      bypassSignIn,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
