import { Link } from 'expo-router';
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

export default function LoginScreen() {
  const { signIn, signInWithGoogle, bypassSignIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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
    if (!email.trim() || !password) {
      notify('Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (!configured) {
      notify('Sign-in is not configured yet.');
      return;
    }
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      if (!/cancelled/i.test(message)) notify(message);
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Use Google, your email, or continue as guest.">
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

      <AuthButton
        label="Sign in"
        loading={busy}
        disabled={googleBusy}
        onPress={() => void onSubmit()}
      />

      <Text style={styles.footer}>
        No account?{' '}
        <Link href="/(auth)/signup" style={styles.link}>
          Create one
        </Link>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
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
