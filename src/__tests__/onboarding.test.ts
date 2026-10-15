import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      memory.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const key of keys) memory.delete(key);
    }),
  },
}));

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => null,
}));

vi.mock('@/lib/storage', () => ({
  resetDemoData: vi.fn(async () => {
    memory.delete('cardflow.profile.v1');
    memory.delete('cardflow.contacts.v1');
    memory.delete('cardflow.groups.v1');
    memory.delete('cardflow.settings.v1');
  }),
}));

import { clearLocalAppData, clearLocalUserContent, acceptLegal, hasAcceptedCurrentLegal, invalidateLegalConsentCache } from '../lib/consent';
import {
  completeOnboarding,
  hasCompletedOnboarding,
  onOnboardingChanged,
  resetOnboarding,
} from '../lib/onboarding';
import { resolvePostAuthRoute } from '../lib/post-auth-route';
import { clearQrDraft, readQrDraft, stageQrDraft } from '../lib/qr-card';
import { EMPTY_DRAFT } from '../lib/contact-draft';

describe('onboarding + post-auth routing', () => {
  beforeEach(async () => {
    memory.clear();
    invalidateLegalConsentCache();
    await resetOnboarding();
    await clearQrDraft();
  });

  it('starts incomplete and completes once', async () => {
    expect(await hasCompletedOnboarding()).toBe(false);
    await completeOnboarding();
    expect(await hasCompletedOnboarding()).toBe(true);
  });

  it('clearLocalAppData resets onboarding and emits', async () => {
    await completeOnboarding();
    expect(await hasCompletedOnboarding()).toBe(true);
    let emitted = false;
    const unsub = onOnboardingChanged(() => {
      emitted = true;
    });
    await clearLocalAppData();
    unsub();
    expect(await hasCompletedOnboarding()).toBe(false);
    expect(emitted).toBe(true);
  });

  it('clearLocalUserContent clears staged QR draft', async () => {
    await stageQrDraft({ ...EMPTY_DRAFT, name: 'Temp', email: 't@x.com' });
    expect(await readQrDraft()).not.toBeNull();
    await clearLocalUserContent();
    expect(await readQrDraft()).toBeNull();
  });

  it('resolvePostAuthRoute follows legal → onboarding → tabs', async () => {
    expect(await resolvePostAuthRoute()).toBe('/legal-consent');
    await acceptLegal();
    expect(await hasAcceptedCurrentLegal()).toBe(true);
    expect(await resolvePostAuthRoute()).toBe('/onboarding');
    await completeOnboarding();
    expect(await resolvePostAuthRoute()).toBe('/(tabs)');
  });

  it('acceptLegal then routes to onboarding when not complete', async () => {
    await resetOnboarding();
    await acceptLegal();
    expect(await resolvePostAuthRoute()).toBe('/onboarding');
  });
});
