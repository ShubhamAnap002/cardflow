/** Loose website check for profile / contact forms (no RN deps). */
export function looksLikeWebsiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return u.hostname.includes('.') || u.hostname === 'localhost';
  } catch {
    return false;
  }
}

export function hostLabelFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '') || url;
  } catch {
    return url;
  }
}

export function withHttpScheme(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
