import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
  type UserProfile,
} from '@/lib/profile';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileModal({ visible, onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    loadProfile().then(setProfile);
  }, [visible]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setProfile((p) => ({ ...p, avatarUri: result.assets[0].uri }));
    }
  }

  async function onSave() {
    setSaving(true);
    await saveProfile(profile);
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Edit Profile</Text>
          <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {profile.name.trim().charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <Text style={styles.changePhoto}>Change photo</Text>
          </Pressable>

          {(
            [
              ['name', 'Full name'],
              ['title', 'Job title'],
              ['company', 'Company'],
              ['email', 'Email'],
              ['phone', 'Phone'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={profile[key]}
                onChangeText={(value) => setProfile((p) => ({ ...p, [key]: value }))}
                style={styles.input}
                autoCapitalize={key === 'email' ? 'none' : 'words'}
                keyboardType={
                  key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'
                }
              />
            </View>
          ))}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSave} style={[styles.btn, styles.btnPrimary]} disabled={saving}>
              <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  avatarWrap: { alignItems: 'center', marginBottom: 8, gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 28, fontWeight: '700' },
  changePhoto: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGhost: { backgroundColor: '#F1F5F9' },
  btnGhostText: { color: '#334155', fontWeight: '600' },
  btnPrimary: { backgroundColor: '#2563EB' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});
