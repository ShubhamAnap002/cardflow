# CardFlow — Google Play listing pack

Prepare everything below **before** paying the Play Console developer fee.  
You can draft store listing text and assets offline; upload once the account is open.

**Package:** `com.shubhamanap.cardflow`  
**Version (app.config.js):** `1.2.0`  
**Support email:** `shubhamanap01@gmail.com`

Related docs: [PLAY_STORE.md](./PLAY_STORE.md) · [PLAY_LAUNCH.md](./PLAY_LAUNCH.md) · [PLAY_DATA_SAFETY.md](./PLAY_DATA_SAFETY.md)

---

## Checklist (do in order)

- [ ] Copy store listing text (Section 1) into a draft note
- [ ] Export Play icon 512×512 from existing assets (Section 2)
- [ ] Design feature graphic 1024×500 (none in repo yet)
- [ ] Shoot phone screenshots on a real device (Section 8 shot list)
- [ ] Confirm privacy + terms URLs open in a browser (Section 3)
- [ ] Fill Data safety from Section 4 when Console is ready
- [ ] Complete content rating questionnaire (Section 5)
- [ ] Create subscription products with exact IDs (Section 6) — needs Console
- [ ] Pay Play Console fee → create app → paste listing → upload AAB (later)

---

## 1. Store listing text (copy-paste)

### App name
```
CardFlow
```
(Play title limit: 30 characters. Keep “CardFlow”.)

### Short description (80 characters max)
```
Scan cards or QR codes into contacts. Organize, share, and export.
```
Character count: **68** (including spaces).

### Full description
```
CardFlow turns paper business cards—and contact QR codes—into organized digital contacts—fast.

Point your camera at a card (or pick a photo from your gallery). CardFlow reads the details so you can review name, company, title, phone, email, and more before saving. Scan a contact QR to fill the same review form. Show your own QR from My QR code so others can save you. Everything stays on your phone so your network is always with you.

WHAT YOU CAN DO
• Scan cards with the camera or import from photos
• Scan contact QR codes (vCard)
• Show and share your card as a QR
• Review and edit fields before you save
• Browse and search your contacts
• Organize people into groups
• Keep your own card ready to share
• Export contacts to Excel (Pro)

FREE PLAN
• A monthly scan allowance for card OCR to get started
• Watch a short rewarded ad for extra OCR scans when you need them
• Banner ads may appear on Free

CARDFLOW PRO
• Unlimited OCR scans
• No ads
• Excel export
• Cloud-assisted card scanning when it helps accuracy

Subscribe monthly or yearly from Settings. Manage or cancel anytime in Google Play.

CardFlow is built for professionals, founders, sales, and anyone who still collects cards at events and meetings—without losing them in a drawer.
```

### Category suggestion
- **Primary:** Business  
- **Secondary (if offered):** Productivity  

### Tags / keywords (for your own ASO notes)
Play no longer has a free-form “tags” field like early listings; put natural keywords in the short/full description and screenshots.

Useful phrases (already woven into copy):
`business card scanner`, `scan business cards`, `QR code contact`, `digital contacts`, `contact organizer`, `card reader`, `network contacts`, `Excel export`, `groups`

Do **not** stuff competitor brand names or misleading claims.

---

## 2. Graphics requirements

| Asset | Required? | Exact size / rules | Status in repo |
|-------|-----------|--------------------|----------------|
| **App icon (Play)** | Yes | **512 × 512** PNG (32-bit with alpha OK) | Export from `assets/images/icon.png` (1024×1024) → resize to 512×512 |
| **Feature graphic** | Yes | **1024 × 500** JPEG or 24-bit PNG (**no transparency**) | **Missing — create** |
| **Phone screenshots** | Yes | **2–8** images; JPEG or 24-bit PNG; each side 320–3840 px; long side ≤ 2× short side | **Missing — shoot on device** |
| Phone screenshots (recommended) | Strongly recommended | **1080 × 1920** portrait (or device native if within rules) | — |
| For featuring eligibility | Recommended | At least **4** screenshots at **≥ 1080 px** on the short side | Aim for **5–6** |

### Existing assets in repo

| File | Size | Use |
|------|------|-----|
| `assets/images/icon.png` | 1024×1024 | Source for Play 512 icon + brand mark |
| `assets/images/brand-mark.png` | 1024×1024 | Optional for feature graphic / marketing |
| `assets/images/android-icon-foreground.png` | 1024×1024 | Adaptive icon layer (build) |
| `assets/images/android-icon-background.png` | 1024×1024 | Adaptive icon layer (build) |
| `assets/images/splash-icon.png` | 1024×1024 | Splash only — not for store |
| `assets/images/favicon.png` | 48×48 | Web only |

### Feature graphic tips
- Brand blue `#2563EB` + light `#F8FAFC` matches the app
- Center: “CardFlow” + short line e.g. “Scan cards. Keep contacts.”
- Avoid Google Play badges, “#1”, prices, or fake UI chrome
- Keep important text in the horizontal center (edges crop on some surfaces)

### Screens to capture from CardFlow
See **Section 8** for the ordered shot list.

---

## 3. Privacy / legal

| Item | URL |
|------|-----|
| **Privacy policy** | `https://shy-fog-9658.shubhamanap02.workers.dev/` |
| **Terms of service** | `https://shy-fog-9658.shubhamanap02.workers.dev/terms.html` |

Before submit: open both in a browser and confirm they load.  
After editing HTML: rebuild/redeploy the privacy Worker (`node server/build-privacy-worker.cjs` → paste into Cloudflare Worker `shy-fog-9658`).

In Play Console: **App content → Privacy policy** → paste the privacy URL.  
Store listing / website fields can also link terms if asked.

---

## 4. Data safety (short answers)

Use with [PLAY_DATA_SAFETY.md](./PLAY_DATA_SAFETY.md). Summary for the questionnaire:

| Data | Collected? | Shared? | Why |
|------|------------|---------|-----|
| Email | Yes | Account provider / sign-in | Account |
| Name | Yes (if provided / Google) | Account backend | Account |
| Photos / images | Yes (card scans, processed for OCR) | Scanning service | App functionality |
| Device / advertising IDs | Yes | Ads + rate limiting | Ads / fraud prevention |
| App activity / ad interactions | Yes (Free) | Ad network | Advertising |
| Purchase history | Via Play Billing | Google Play | App functionality (Pro) |

**Not collected / not uploaded as a cloud address book:** full phone contact list, precise location, SMS, call logs.

**Security practices to declare:**
- Data encrypted in transit (HTTPS)
- Users can request deletion (Settings → Delete account + clear local data)

**Ads:** Yes (Free plan). Declare that the app contains ads.

---

## 5. Content rating / target audience

| Question area | Suggested answer |
|---------------|------------------|
| Target age | **18+** / adults; professional use |
| Children | **Not** directed at children under 13 |
| Violence / sexual content / drugs | None |
| User-generated content | Contacts are private/on-device; not a social feed |
| In-app purchases | **Yes** (subscriptions) |
| Ads | **Yes** (Free) |
| Share location | No |
| Contests / gambling | No |

Complete the official **IARC questionnaire** in Play Console; expect a low rating suitable for general audiences (e.g. Everyone / PEGI 3 equivalent), subject to questionnaire outcomes.

---

## 6. Subscription products to create

Play Console → **Monetize → Products → Subscriptions**

| Product ID (exact) | Billing period | Suggested name |
|--------------------|----------------|----------------|
| `cardflow_pro_monthly` | 1 month | CardFlow Pro Monthly |
| `cardflow_pro_yearly` | 1 year | CardFlow Pro Yearly |

**Suggested description (both):**  
CardFlow Pro — unlimited scans, no ads, Excel export, and cloud-assisted scanning.

Activate both after setting prices.  
Optional: deactivate legacy one-time product `cardflow_pro` if it still exists.

License testing: Play Console → Settings → License testing → add tester Gmails.

---

## 7. Contact email

```
shubhamanap01@gmail.com
```

Used for: Play Console developer contact, store listing “Email”, privacy policy contact, and in-app support (`EXPO_PUBLIC_SUPPORT_EMAIL`).

---

## 8. Screenshot shot list (shoot on device)

Use a physical Android phone (or emulator only if resolution is clean). Prefer **portrait**, status bar tidy, no personal real emails if possible—use sample contacts.

Aim for **5–6** phone screenshots (min 2; recommend 4+ at ≥1080px):

| # | Screen | What to show | Tips |
|---|--------|--------------|------|
| 1 | **Home** | Greeting, stats, “Start scan”, My QR quick action | Best first impression |
| 2 | **Scan sheet** | “Add a contact” with photo / gallery / QR | Shows all entry paths |
| 3 | **Review** | Extracted fields filled (name, company, phone, email) | Shows the “magic” moment |
| 4 | **My QR** | Large QR + name under YOUR CARD | Share / networking story |
| 5 | **Contacts** | List with several sample people | Search bar visible if possible |
| 6 | **Settings / Upgrade** | Free vs Pro benefits (Monthly / Yearly) | Monetization clarity — optional but useful |

**Prep before shooting:**
- Sign in with a test account
- Accept privacy & terms
- Add 4–6 fake contacts + 1–2 groups
- Prefer **Pro / local Pro on preview** for ad-free screenshots, **or** crop/hide ads if shooting Free
- Do not show debug menus, error toasts, or stack names

**Optional later:** 7" / 10" tablet screenshots (not required for phone-only launch).

---

## 9. What you can prepare without paying the fee

| Ready now | Needs Play Console ($) |
|-----------|-------------------------|
| Listing text (this doc) | Create app listing + upload AAB |
| Icon export 512×512 | Content rating formal submit |
| Feature graphic design | Data safety form submit |
| Screenshot capture | Activate subscriptions |
| Privacy/terms URLs live | Closed testing track |
| AdMob app/units (can start free) | Production rollout |

When ready to ship builds, follow [PLAY_LAUNCH.md](./PLAY_LAUNCH.md) (AAB + closed testing). Do **not** rely on this doc alone for billing env setup.
