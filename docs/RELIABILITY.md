# CardFlow reliability

Target: high reliability for OCR scans, contact merge, and release builds.

## Automated checks

```bash
npm run check   # tsc --noEmit + vitest
npm test        # unit tests only
```

Covered today:

- Contact draft validation (name, multi-email, phone)
- Front/back card merge + confidence average
- OCR field normalization / retryable status helpers
- Privacy / terms content presence + hosted privacy URL default

## OCR flake hardening

**App (`src/lib/ocr.ts`)**

- Up to **3** attempts on 408 / 429 / 502 / 503 / 504, timeouts, and network failures
- Exponential-ish backoff between attempts
- Secrets never leave the Worker (`EXPO_PUBLIC_API_URL` only)

**Worker (`server/cloudflare-worker.js`)**

- `GET /` and `GET /health` → `{ ok, service, models, ts }` for monitoring
- Per Gemini model: up to **2** attempts on overload / not-found / rate limit
- Falls through model list when a model is unavailable

Redeploy the OCR Worker after pulling Worker changes:

```bash
# From Cloudflare dashboard paste, or wrangler deploy if configured
```

Health check:

```bash
curl -s https://cardflow-ocr.shubhamanap02.workers.dev/health
```

## Crash recovery

`AppErrorBoundary` wraps the root navigator. Render crashes show a recovery screen instead of a blank app; contacts on device are not wiped by the boundary.

## APK / AAB size

- **Preview**: APK for sideload testing
- **Production**: AAB (Play delivers ABI splits)
- `expo-build-properties`: release APKs/AABs ship `arm64-v8a` + `armeabi-v7a` only (no x86 emulator slices in store artifacts)

RN baseline size remains normal; store users get smaller downloads via AAB.

## Ops checklist before a Play release

1. `npm run check` passes
2. OCR Worker `/health` returns `ok: true`
3. Run `docs/supabase-delete-account.sql` if not already applied
4. Build production AAB (not APK) for store
5. Spot-check: scan front, scan back, merge, export (Pro), delete account
