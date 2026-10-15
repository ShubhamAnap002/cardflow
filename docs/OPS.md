# CardFlow — Operations & deploy notes (Phase A)

## OCR Worker
- URL: `https://cardflow-ocr.shubhamanap02.workers.dev`
- Code: [`server/cloudflare-worker.js`](../server/cloudflare-worker.js)
- Secrets:
  - `OCR_API_KEY` = Gemini key (required)
  - `OCR_CLIENT_KEY` = long random string (recommended) — same value as app `EXPO_PUBLIC_OCR_CLIENT_KEY`
- App env: `EXPO_PUBLIC_API_URL` (+ optional `EXPO_PUBLIC_OCR_CLIENT_KEY`) — never put the Gemini key in the app

### Deploy Worker
1. Cloudflare Dashboard → Workers → `cardflow-ocr` → Edit code  
2. Paste full `server/cloudflare-worker.js` → Deploy  
3. Settings → Variables → set `OCR_API_KEY` and `OCR_CLIENT_KEY` secrets  
4. Set matching `EXPO_PUBLIC_OCR_CLIENT_KEY` in EAS / `.env`

### Smoke test
```bash
curl -X POST https://cardflow-ocr.shubhamanap02.workers.dev/scan \
  -H "Content-Type: application/json" \
  -H "x-device-id: ops-test" \
  -H "x-cardflow-key: YOUR_OCR_CLIENT_KEY" \
  -d "{\"imageBase64\":\"<base64>\"}"
```

### APK test
Install latest preview APK → Scan a real business card → confirm fields on Review.

## Privacy / Terms Worker (`shy-fog-9658`)
- Live URL: `https://shy-fog-9658.shubhamanap02.workers.dev/` (homepage = Privacy Policy)
- Terms: `https://shy-fog-9658.shubhamanap02.workers.dev/terms.html`
- Source HTML: `docs/pages-upload/index.html`, `docs/pages-upload/terms.html`
- Generated Worker: `server/privacy-pages-worker.js` via `node server/build-privacy-worker.cjs`

### Rebuild + deploy
1. Edit HTML under `docs/pages-upload/` if needed  
2. `node server/build-privacy-worker.cjs`  
3. Cloudflare Dashboard → Workers → **`shy-fog-9658`** → Edit code  
4. Replace with full `server/privacy-pages-worker.js` → **Deploy**

### Google Search Console (HTML meta tag)
1. Search Console → Add property → URL prefix → `https://shy-fog-9658.shubhamanap02.workers.dev/`  
2. Choose **HTML tag** verification  
3. Copy **only** the `content="…"` token (not the full `<meta>` tag)  
4. Put it in `.env` as `GOOGLE_SITE_VERIFICATION=<token>`  
5. Rebuild + deploy as above  
6. Confirm live homepage HTML contains `<meta name="google-site-verification" content="…">`  
7. Click **Verify** in Search Console

## Supabase SQL (order)
1. `docs/supabase-schema.sql`
2. `docs/supabase-profiles-v2.sql`
3. `docs/supabase-delete-account.sql`
4. `docs/supabase-profiles-rls-harden.sql` ← **required** so users cannot self-grant Pro / reset OCR via the client
