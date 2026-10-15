/** Live hosted policy (Cloudflare Worker / Pages). */
export const DEFAULT_PRIVACY_URL = 'https://shy-fog-9658.shubhamanap02.workers.dev/';

export function getPrivacyUrl(): string {
  const raw = process.env.EXPO_PUBLIC_PRIVACY_URL?.trim();
  if (!raw) return DEFAULT_PRIVACY_URL;
  if (/your-domain|example\.com|localhost/i.test(raw)) return DEFAULT_PRIVACY_URL;
  return raw.replace(/\/?$/, '/');
}
