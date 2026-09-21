import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { notify } from '@/lib/feedback';
import { DEFAULT_PROFILE, initialsOf, loadProfile, saveProfile, type Profile } from '@/lib/storage';

type FieldKey = 'name' | 'title' | 'company' | 'email' | 'phone';

const FIELDS: {
  key: FieldKey;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
}[] = [
  { key: 'name', label: 'Full name', placeholder: 'Alex Rivera' },
  { key: 'title', label: 'Job title', placeholder: 'Founder' },
  { key: 'company', label: 'Company', placeholder: 'CardFlow' },
  {
    key: 'email',
    label: 'Email',
    placeholder: 'you@company.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
  { key: 'phone', label: 'Phone', placeholder: '+1 415 555 0142', keyboardType: 'phone-pad' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void loadProfile().then((stored) => {
      if (!active) return;
      setProfile(stored);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function change(key: FieldKey, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Allow photo access to change your picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    const uri = result.canceled ? undefined : result.assets?.[0]?.uri;
    if (uri) setProfile((prev) => ({ ...prev, avatarUri: uri }));
  }

  async function onSave() {
    const found: Partial<Record<FieldKey, string>> = {};
    if (!profile.name.trim()) found.name = 'Your name is required.';
    if (profile.email.trim() && !EMAIL_RE.test(profile.email.trim())) {
      found.email = 'Enter a valid email address.';
    }
    if (profile.phone.trim() && profile.phone.replace(/\D/g, '').length < 7) {
      found.phone = 'Enter a valid phone number.';
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await saveProfile({
        ...profile,
        name: profile.name.trim(),
        title: profile.title.trim(),
        company: profile.company.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      notify('Profile updated.');
      router.back();
    } catch {
      notify('Could not save your profile.');
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Edit profile" eyebrow="YOUR CARD" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScreenBody contentStyle={styles.content}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={pickAvatar}
              style={styles.avatarWrap}
            >
              <Avatar
                initials={initialsOf(profile.name)}
                uri={profile.avatarUri}
                size={88}
                seed="me"
              />
              <Text style={styles.changePhoto}>
                {profile.avatarUri ? 'Change photo' : 'Add a photo'}
              </Text>
            </Pressable>

            <Text style={styles.intro}>
              This is the card CardFlow shares when you send your details to someone.
            </Text>

            {FIELDS.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  value={profile[field.key]}
                  onChangeText={(value) => change(field.key, value)}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.outline}
                  style={[styles.input, errors[field.key] ? styles.inputError : null]}
                  keyboardType={field.keyboardType ?? 'default'}
                  autoCapitalize={field.autoCapitalize ?? 'words'}
                  autoCorrect={false}
                />
                {errors[field.key] ? (
                  <Text style={styles.error}>{errors[field.key]}</Text>
                ) : null}
              </View>
            ))}
          </ScreenBody>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <PrimaryButton
              label="Cancel"
              variant="ghost"
              style={styles.flex}
              disabled={saving}
              onPress={() => router.back()}
            />
            <PrimaryButton
              label="Save profile"
              icon="done"
              loading={saving}
              style={styles.flex}
              onPress={onSave}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { gap: spacing.sm },
  avatarWrap: { alignItems: 'center', gap: spacing.xxs },
  changePhoto: { ...type.label, color: colors.primary },
  intro: { ...type.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' },
  field: { gap: spacing.xxs + 1 },
  label: { ...type.label, color: colors.onSurfaceVariant },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    ...type.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputError: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  error: { ...type.label, color: colors.onErrorSoft, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    ...shadows.raised,
  },
});
