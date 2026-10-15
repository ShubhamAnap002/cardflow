# CardFlow — project context

Living status doc. Update this when work meaningfully changes (features, blockers, launch steps). Do not put secrets here.

**Last updated:** 2026-09-26  
**Branch:** `main`  
**App version (package.json):** 1.2.0  
**Package:** `com.shubhamanap.cardflow`  
**Active build:** preview APK **FINISHED** (`73f4d0fa…`) — export card + review fixes + view-shot; Desktop `CardFlow-preview-latest.apk` / `CardFlow.apk`. Prior: `095a5035…`. Production AAB still available (`07aaf9e9…`).  
**Privacy Worker:** Live on `shy-fog-9658` (redeployed 25 Sep) — privacy + terms show Last updated 25 September 2026 + QR scan language.

---

## What CardFlow is

Native Expo SDK 57 / React Native / expo-router app: scan business cards (camera/gallery + OCR), scan contact QR codes, share your card as a QR, save contacts/groups, edit your own card, optional Pro (unlimited scans, no ads, Excel export).

---

## Current state (honest)

| Area | Status | Notes |
|------|--------|--------|
| Core UI (Home, Contacts, Groups, Settings, Scan, Review) | Built locally | QR: My QR + Scan QR → same Review; OCR path unchanged |
| Auth (email + Google via Supabase) | Fixed locally | Sign-out clears session **and** local profile/contacts; Guest mode bypass for web |
| Legal consent / privacy / terms | Synced | In-app ↔ HTML ↔ live Worker; no stack names in user copy |
| On-device OCR (ML Kit) + cloud OCR worker | Built | Worker: `EXPO_PUBLIC_API_URL` |
| Interactive OCR "Tap-to-Fill" Assistant | **Complete & Verified** | Field icons (company, name, phone, email, address) open modal displaying raw card lines to fill fields on tap |
| Lead Enrichment & Classification | **Complete & Verified** | Domestic/International, Level (Platinum/Gold/Silver/Bronze), Scope (Bulk/Small), Dual Mobile & Email, Catalog Product Tagging |
| Voice Remarks & Audio Note Memo | **Complete & Verified** | Live Web Speech API dictation (`Speak`/`Stop`), auto-detect badge, live transcript, and audio recording attachment |
| EnerTech Engage CRM Integration | **Complete & Verified** | Auto-dispatches to `https://enertechups-ai.onrender.com/api/v1/leads` on save/edit with `source: EXPO`, priority/score calculation, offline retry queue |
| Free quota + rewarded ads + Pro IAP | **Subscriptions** | Monthly `cardflow_pro_monthly` + yearly `cardflow_pro_yearly`; Settings Upgrade/Manage |
| AdMob banners / interstitial / rewarded | Wired | Free interstitial skips first 3 successful saves, then ~90s cooldown; Pro = no ads |
| SQLite / backup / profile sync | Removed SQLite mirror | Contacts = AsyncStorage only; optional Excel export |
| Play Store listing / Data Safety docs | Drafted under `docs/` | Full copy pack in `docs/PLAY_LISTING.md`; screenshots + feature graphic still needed |
| Web Platform (`npm run web` / `dist`) | **Complete & Verified** | Full web migration with zero Android regressions. Platform adapters for ads, billing, camera, QR, card export, and Excel. |
| Git | **Not committed** | Huge local WIP; `.env` must stay untracked |

**Verdict:** Feature-complete with **EnerTech CRM EXPO Lead Sync**, **Double-Sided Review**, **Interactive OCR Tap-to-Fill**, and **Voice-to-Text Remarks**. Ready for production and testing.

---

## If you build an APK today — what you will see

Depends on EAS profile:

### `preview` (APK, internal) — typical dogfood build

Env baked in `eas.json`: Supabase, OCR worker, privacy URL, AdMob, **`EXPO_PUBLIC_ALLOW_LOCAL_PRO=1`**.

1. **Splash** → fonts load.
2. **Login / signup** (email+password and Google) — you must sign in (Supabase is configured).
3. **Legal consent** (privacy + terms) once, if not already accepted on that install.
4. **Main tabs:** Home · Contacts · Groups · Settings (+ centre Scan).
5. **Home:** greeting, stats, Start scan, quick actions, ad banner (if not Pro).
6. **Scan:** camera or gallery → **Review** fields → save contact.
7. **OCR:** on-device ML Kit; cloud worker when needed / Pro path.
8. **Free limits:** ~15 scans/month; paywall offers watch-ad (+3) or Upgrade to Pro.
9. **Settings:** export Excel (Pro), buy/restore Pro, sign out, clear data / delete account, legal links.
10. **Local Pro unlock** may work in preview (dev flag) — do **not** rely on this for store builds.

### `production` (AAB for Play, not APK by default)

Same app flows, but `ALLOW_LOCAL_PRO=0` — real Play Billing only. Ads + IAP need Play Console / AdMob / license testers set up.

### Without Supabase env

Would skip forced login and go to legal consent → tabs (local-only). Preview/prod profiles **do** include Supabase, so expect login.

**You will not fully prove in one sideloaded APK alone:** real Play purchase flow (needs Play install + product live), production ad fill quality, or store listing approval.

---

## Key paths

| Path | Role |
|------|------|
| `src/app/_layout.tsx` | Auth + legal routing gate |
| `src/app/(auth)/` | Login / signup |
| `src/app/(tabs)/` | Main app |
| `src/app/scan.tsx` / `review.tsx` | Capture + confirm |
| `src/lib/entitlements.ts` | Free/Pro quota |
| `src/lib/ocr.ts` / `mlkit-ocr.ts` | OCR |
| `src/lib/supabase.ts` | Backend client |
| `eas.json` | Build profiles + public env |
| `docs/PLAY_*.md` | Store / billing / data safety |
| `.env` / `.env.example` | Local secrets template — **never commit `.env`** |

---

## Active work / next priorities

1. **Dogfood preview APK** — install Desktop `CardFlow-preview-latest.apk` (`73f4d0fa…`); test Share card image.
2. **Play listing prep** — shoot phone screenshots + design 1024×500 feature graphic; copy pack ready in `docs/PLAY_LISTING.md` (fee not required yet).
3. **Upload production AAB** to Play Console (v1.2.0 / versionCode 2) — file on Desktop or expo artifact link — after fee.
4. **Play Console** — create/activate `cardflow_pro_monthly` + `cardflow_pro_yearly` (retire one-time `cardflow_pro` if present).
5. **Search Console** — verify ownership on Worker URL (meta tag already live) → retry Google OAuth verification if still pending.
6. **Commit WIP** in logical chunks (when asked) — exclude `.env`.
7. **Ops (if not done)** — apply profiles RLS harden SQL; OCR worker key; confirm `delete_own_account` RPC.

---

## Decisions / conventions

- Contacts primarily on-device; Supabase for auth + remote profile/plan sync.
- Free: 15 OCR scans/month; rewarded ads add bonus scans (capped). Interstitial after save skips first 3 successful saves, then ~90s cooldown.
- Pro: **subscriptions** — `cardflow_pro_monthly` / `cardflow_pro_yearly` via Google Play; Manage opens Play subscription settings.
- No Gemini/OCR secrets in the app — only on Cloudflare Worker.
- User-facing copy must **not** name internal stack (Supabase, Gemini, ML Kit, Cloudflare, Expo).
- Prefer updating **this file** over scattering status across chats.

---

## Changelog (short)

| Date | Note |
|------|------|
| 2026-09-23 | Context file created. Status: large uncommitted WIP (auth, OCR, ads, Pro, Play docs). Last git commits: Expo Router rewrite + tab nav / versionCode fixes. |
| 2026-09-23 | Dropped emulator workflow. Fixed `runtimeVersion` to `1.2.0`, removed local `android/`. EAS preview APK building for phone test. |
| 2026-09-23 | Legal scrub + sync; Google account-switch harden; home/auth layout centering; neutral placeholders; hide stack names in UI strings. |
| 2026-09-23 | Email verify-after-signup; single Privacy & terms gate; Pro switched to monthly/yearly subscriptions; Settings Upgrade/Manage (no Restore row). |
| 2026-09-23 | Sign-out / delete: clear local profile+contacts so next login does not inherit previous card; delete always wipes local even if RPC errors. |
| 2026-09-23 | Privacy Worker: `GOOGLE_SITE_VERIFICATION` inject via `build-privacy-worker.cjs` for Search Console HTML-tag (Option B); docs in OPS / GOOGLE_AUTH. |
| 2026-09-23 | Production Android AAB FINISHED (`07aaf9e9…`): app 1.2.0, versionCode 2; downloaded to Desktop as `CardFlow-production.aab`. |
| 2026-09-23 | Search Console token set in `.env`; fixed injection bug (HTML comment false-positive); rebuilt `privacy-pages-worker.js` with verification meta — deploy Worker next. |
| 2026-09-23 | Clarified deploy: shy-fog is Workers (not Pages); synced `google-site-verification` into `docs/pages-upload/index.html` so Pages path stays in sync with Worker bake. |
| 2026-09-24 | Free interstitial: skip first 3 successful contact saves (AsyncStorage counter); 4th+ uses existing cooldown; banner/rewarded/Pro unchanged. |
| 2026-09-24 | Added `docs/PLAY_LISTING.md` — ready-to-copy store text, graphics sizes, shot list, privacy/terms, Data safety summary, subscription IDs (prep without Console fee). |
| 2026-09-24 | Code-review fixes: preserve rewarded OCR bonus on profile sync; remote plan no longer revokes Play Pro; clear local data on auth user-id change; AdBanner rechecks Pro on focus; sync Play subs on login. |
| 2026-09-24 | Follow-up: wipe before setSession + local-data reload signal; keep remote promo Pro when Play has no sub; add android-icon-monochrome.png. |
| 2026-09-24 | OAuth callback waits for deep-link URL before latch; restoreProFromStore no longer wipes promo/admin Pro when Play has no sub. |
| 2026-09-24 | applySession syncs remote profile before setSession so banned accounts never appear signed-in. |
| 2026-09-24 | Settings Clear local data uses clearLocalUserContent (contacts/profile only); Pro/auth preserved. Full wipe remains for sign-out/delete. |
| 2026-09-24 | Profiles RLS harden SQL + RPCs; app unlocks remote Pro only for promo/admin; restore `updates.url` in app.config.js. |
| 2026-09-24 | Banned accounts: signIn/Google await applySession and surface “account disabled” instead of silent bounce. |
| 2026-09-24 | OAuth callback awaits hydrateSession (applySession) before routing to tabs; banned shows notify + login. |
| 2026-09-24 | Added vitest entitlements/billing tests (Pro flag, OCR quota, rewarded caps, Play SKUs) — 31 tests passing. |
| 2026-09-24 | OAuth callback: timeout only tries existing session; late deep-link URL can still complete sign-in. |
| 2026-09-25 | Profile sync: insert-only create (no upsert wipe); skip Play revoke when profile null; clearer sign-out wipe copy. |
| 2026-09-25 | Preview Android APK FINISHED (`8f703880…`): app 1.2.0, versionCode 2; Desktop `CardFlow-preview-latest.apk`. |
| 2026-09-25 | QR feature (additive): My QR (vCard) on Profile; Scan QR via expo-camera → Review; no OCR quota; needs new native build. |
| 2026-09-25 | QR fixes: remount-safe draft read/clear; My QR reloads on focus; wipe clears qrDraft; http open confirm. |
| 2026-09-25 | QR concurrent-load guard; Settings skip Play revoke when profile null; My QR no focus flash. |
| 2026-09-25 | QR UX: Add a contact sheet; Home/Settings My QR; no interstitial on QR save; listing/legal/QR torch. |
| 2026-09-25 | Share uses real vCard; Settings share hub = My QR; home copy; rebuilt privacy Worker JS. |
| 2026-09-25 | QR deep fixes: shareable gate; lockedRef; ITEMn.EMAIL parse; mailto; unified camera copy. |
| 2026-09-25 | QR parse: strip PHOTO; QP UTF-8; MECARD/tel; preview APK building for native QR. |
| 2026-09-25 | QR share UX: Full/Limited toggle; share QR image or vCard; URL save keeps full link; contact QR screen. |
| 2026-09-25 | Limited QR now includes website (name + phone + website). |
| 2026-09-25 | My QR defaults to Full details; profile gains Website field. |
| 2026-09-25 | QR review fixes: Limited fallback, param ids, https confirm, note cap, Excel formula sanitize. |
| 2026-09-25 | UI/UX polish: honest status copy, a11y labels, settings on all tabs, group delete button, token unify. |
| 2026-09-25 | Perf/UX fixes: QR draft remount-safe, SQLite sync-on-write, From QR badge, dead settings pruned. |
| 2026-09-25 | AsyncStorage-only contacts (dropped SQLite); first-run onboarding + on-device data copy. |
| 2026-09-25 | Gate harden: wipe emits onboarding reset; shared post-auth route; sync consent/onboarding cache. |
| 2026-09-25 | Privacy Worker `shy-fog-9658` redeployed; live privacy/terms match 25 Sep QR legal. |
| 2026-09-25 | Preview APK FINISHED (`095a5035…`): full WIP; Desktop `CardFlow-preview-latest.apk` (~176 MB). |
| 2026-09-25 | Locked export card image (Share card image) on My QR + Contact QR; needs new native build (view-shot). |
| 2026-09-25 | Review fixes: export capture paint, QR draft clear on leave/clear-data, storage harden, signed-out gate. |
| 2026-09-25 | Dead code removed: JSON QR encode, PRO_PRODUCT_ID, openTerms/getTermsUrl, unused exports. |
| 2026-09-25 | Storage write try/catch on groups/contacts/settings; preview APK rebuild for view-shot. |
| 2026-09-25 | Preview APK FINISHED (`73f4d0fa…`): export card + fixes; Desktop `CardFlow-preview-latest.apk`. |
| 2026-10-15 | Web platform migration completed: decoupled native-only AdMob, Play Billing, ML Kit, view-shot, and FileSystem via `.web.ts` and `.web.tsx` platform adapters. Added web webcam QR frame scanner with `jsqr`, file upload fallbacks, responsive desktop shell (`screen.web.tsx`), DOM card export, and native browser Excel export. Zero regressions on Android, 66 tests passing, web export builds cleanly (`dist`). |

