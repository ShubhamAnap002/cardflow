import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  AuthButton,
  AuthDivider,
  AuthField,
  AuthShell,
} from '@/components/auth-shell';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { notify } from '@/lib/feedback';

export default function SignupScreen() {
  const { signUp, signInWithGoogle, bypassSignIn, resendSignupEmail, configured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setBusyGoogle] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);

  async function onBypass() {
    setBusy(true);
    try {
      await bypassSignIn();
      notify('Welcome! Continuing in Guest mode.');
    } catch {
      notify('Could not start guest session.');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!configured) {
      notify('Sign-in is not configured yet.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      notify('Use a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await signUp(email, password, name);
      if (result.needsEmailVerification) {
        setPendingVerifyEmail(result.email);
        notify('Check your email to verify your account.');
      } else {
        // Session is live — root gate shows Privacy & terms once if needed.
        notify('Account created.');
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Sign up failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!pendingVerifyEmail) return;
    setResendBusy(true);
    try {
      await resendSignupEmail(pendingVerifyEmail);
      notify('Verification email sent again.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not resend email.');
    } finally {
      setResendBusy(false);
    }
  }

  async function onGoogle() {
    if (!configured) {
      notify('Sign-in is not configured yet.');
      return;
    }
    setBusyGoogle(true);
    try {
      await signInWithGoogle();
      // Root gate shows Privacy & terms once for new users.
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      if (!/cancelled/i.test(message)) notify(message);
    } finally {
      setBusyGoogle(false);
    }
  }

  if (pendingVerifyEmail) {
    return (
      <AuthShell title="Verify your email" subtitle="Almost there — confirm your address to continue.">
        <Text style={styles.verifyBody}>
          We sent a verification link to{'\n'}
          <Text style={styles.verifyEmail}>{pendingVerifyEmail}</Text>
        </Text>
        <Text style={styles.verifyHint}>
          Open the email, tap the link, then come back here and sign in with your email and password.
        </Text>

        <AuthButton
          label="I verified — sign in"
          onPress={() => router.replace('/(auth)/login')}
        />
        <AuthButton
          label="Resend email"
          variant="ghost"
          loading={resendBusy}
          onPress={() => void onResend()}
        />

        <Text style={styles.footer}>
          Wrong email?{' '}
          <Text style={styles.link} onPress={() => setPendingVerifyEmail(null)}>
            Edit details
          </Text>
        </Text>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Contacts stay on this device.">
      <AuthButton
        label="Continue as Guest (Bypass Sign-in)"
        variant="ghost"
        icon="person"
        disabled={busy || googleBusy}
        onPress={() => void onBypass()}
      />

      <AuthDivider />

      <AuthButton
        label="Sign in with Google"
        variant="ghost"
        icon="person"
        loading={googleBusy}
        disabled={busy}
        onPress={() => void onGoogle()}
      />

      <AuthDivider />

      <AuthField
        label="Display name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        placeholder="Optional"
      />
      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
      />

      <Text style={styles.legalNote}>
        By continuing you agree to our{' '}
        <Link href="/privacy" style={styles.inlineLink}>
          Privacy Policy
        </Link>{' '}
        and{' '}
        <Link href="/terms" style={styles.inlineLink}>
          Terms
        </Link>
        . You will confirm once after sign-in.
      </Text>

      <AuthButton
        label="Create account"
        loading={busy}
        disabled={googleBusy}
        onPress={() => void onSubmit()}
      />

      <Text style={styles.footer}>
        Already have an account?{' '}
        <Link href="/(auth)/login" style={styles.link}>
          Sign in
        </Link>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  legalNote: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  inlineLink: { color: colors.primary, fontWeight: '700' },
  verifyBody: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    textAlign: 'center',
  },
  verifyEmail: {
    fontFamily: 'Outfit_700Bold',
    color: colors.primary,
  },
  verifyHint: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 4,
  },
  footer: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  link: {
    fontFamily: 'Outfit_700Bold',
    color: colors.primary,
  },
});
