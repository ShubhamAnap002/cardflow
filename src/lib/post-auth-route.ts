import { hasAcceptedCurrentLegal } from '@/lib/consent';
import { hasCompletedOnboarding } from '@/lib/onboarding';

export type PostAuthRoute = '/(tabs)' | '/legal-consent' | '/onboarding';

/**
 * Shared post-auth destination so OAuth callback, email login, and legal
 * consent all use the same legal → onboarding → tabs order.
 */
export async function resolvePostAuthRoute(): Promise<PostAuthRoute> {
  const consentOk = await hasAcceptedCurrentLegal();
  if (!consentOk) return '/legal-consent';
  const onboarded = await hasCompletedOnboarding();
  if (!onboarded) return '/onboarding';
  return '/(tabs)';
}
