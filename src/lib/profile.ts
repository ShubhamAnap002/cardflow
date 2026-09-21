import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cardflow.profile.v1';

export type UserProfile = {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  avatarUri?: string;
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Alex Rivera',
  title: 'Founder',
  company: 'CardFlow',
  email: 'alex@cardflow.app',
  phone: '+1 415 555 0142',
};

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile) {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}
