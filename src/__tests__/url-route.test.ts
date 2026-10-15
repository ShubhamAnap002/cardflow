import { describe, expect, it } from 'vitest';

import { paramString } from '../lib/route-params';
import { looksLikeWebsiteUrl } from '../lib/website-url';

describe('paramString', () => {
  it('returns first entry from string arrays', () => {
    expect(paramString(['a', 'b'])).toBe('a');
    expect(paramString('solo')).toBe('solo');
    expect(paramString(undefined)).toBeUndefined();
  });
});

describe('looksLikeWebsiteUrl', () => {
  it('accepts hosts with and without scheme', () => {
    expect(looksLikeWebsiteUrl('example.com')).toBe(true);
    expect(looksLikeWebsiteUrl('https://example.com/path')).toBe(true);
    expect(looksLikeWebsiteUrl('not a url')).toBe(false);
    expect(looksLikeWebsiteUrl('')).toBe(false);
  });
});
