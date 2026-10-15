import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'cardflow.onboarding.v1';

type Listener = () => void;
const listeners = new Set<Listener>();

/** Sync cache so the root gate can update before the next paint after complete/reset. */
let cached: boolean | null = null;

export function onOnboardingChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

/** Immediate value when known (after read/complete/reset); null until first load. */
export function peekOnboardingCompleted(): boolean | null {
  return cached;
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    cached = raw === '1';
    return cached;
  } catch {
    cached = false;
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  cached = true;
  emit();
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignore
  }
  cached = false;
  emit();
}
