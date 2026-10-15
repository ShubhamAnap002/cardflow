import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * SecureStore has a size limit; fall back to AsyncStorage on web / large values.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export type RemoteProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: 'free' | 'pro';
  ocr_month: string | null;
  ocr_count: number | null;
  created_at?: string | null;
  last_seen_at?: string | null;
  pro_since?: string | null;
  pro_source?: 'play' | 'promo' | 'admin' | null;
  scan_total?: number | null;
  app_version?: string | null;
  status?: 'active' | 'banned' | null;
  is_admin?: boolean | null;
  updated_at?: string;
};

export const PROFILE_SELECT =
  'id,email,display_name,plan,ocr_month,ocr_count,created_at,last_seen_at,pro_since,pro_source,scan_total,app_version,status,is_admin,updated_at';
