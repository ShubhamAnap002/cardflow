import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DEFAULT_PROFILE, loadProfile, saveProfile, type UserProfile } from '@/lib/profile';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
};

type FieldKey = 'name' | 'title' | 'company' | 'email' | 'phone';

const FIELDS: {
  key: FieldKey;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}[] = [
  { key: 'name', label: 'Full name', placeholder: 'Alex Rivera' },
  { key: 'title', label: 'Job title', placeholder: 'Founder' },
  { key: 'company', label: 'Company', placeholder: 'CardFlow' },
  { key: 'email', label: 'Email', placeholder: 'you@company.com', keyboardType: 'email-address' },
  { key: 'phone', label: 'Phone', placeholder: '+1 415 555 0142', keyboardType: 'phone-pad' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ProfileModal({ visible, onClose, onSaved }: Props) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setErrors({});
    loadProfile()
      .then((stored) => {
        if (!cancelled) setProfile(stored);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const update = useCallback((key: FieldKey, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onSaved?.('Allow photo access to change your picture.');
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
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    if (!profile.name.trim()) nextErrors.name = 'Your name is required.';
    if (profile.email.trim() && !EMAIL_RE.test(profile.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (profile.phone.trim() && profile.phone.replace(/\D/g, '').length < 7) {
      nextErrors.phone = 'Enter a valid phone number.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const trimmed: UserProfile = {
        ...profile,
        name: profile.name.trim(),
        title: profile.title.trim(),
        company: profile.company.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      };
      await saveProfile(trimmed);
      setProfile(trimmed);
      onSaved?.('Profile updated.');
      onClose();
    } catch {
      onSaved?.('Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <Text style={styles.title}>Edit profile</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={10}
                  onPress={onClose}
                  style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
                >
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.subtitle}>
                This is the card you share when you send your details.
              </Text>
            </View>

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color="#2563EB" />
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                  onPress={pickAvatar}
                  style={styles.avatarWrap}
                >
                  {profile.avatarUri ? (
                    <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarLetter}>{initial}</Text>
                    </View>
                  )}
                  <Text style={styles.changePhoto}>
                    {profile.avatarUri ? 'Change photo' : 'Add a photo'}
                  </Text>
                </Pressable>

                {FIELDS.map(({ key, label, placeholder, keyboardType }) => (
                  <View key={key} style={styles.field}>
                    <Text style={styles.label}>{label}</Text>
                    <TextInput
                      value={profile[key]}
                      onChangeText={(value) => update(key, value)}
                      placeholder={placeholder}
                      placeholderTextColor="#94A3B8"
                      style={[styles.input, errors[key] && styles.inputError]}
                      autoCapitalize={key === 'email' ? 'none' : 'words'}
                      autoCorrect={false}
                      keyboardType={keyboardType ?? 'default'}
                      returnKeyType="next"
                    />
                    {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                disabled={saving}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnGhost,
                  pressed && styles.btnGhostPressed,
                ]}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onSave}
                disabled={saving || loading}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  pressed && styles.btnPrimaryPressed,
                  (saving || loading) && styles.btnDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Save profile</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  keyboardWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { backgroundColor: '#E2E8F0' },
  closeText: { fontSize: 14, color: '#475569', fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 18, color: '#64748B', marginTop: 4 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 12 },
  avatarWrap: { alignItems: 'center', gap: 6, marginBottom: 4 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#E2E8F0' },
  avatarFallback: { backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 32, fontWeight: '700' },
  changePhoto: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
  field: { gap: 5 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 12, color: '#DC2626' },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btn: { flex: 1, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#F1F5F9' },
  btnGhostPressed: { backgroundColor: '#E2E8F0' },
  btnGhostText: { color: '#334155', fontWeight: '700', fontSize: 15 },
  btnPrimary: { backgroundColor: '#2563EB' },
  btnPrimaryPressed: { backgroundColor: '#1D4ED8' },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
