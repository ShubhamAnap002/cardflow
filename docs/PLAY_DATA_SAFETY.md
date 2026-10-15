# Play Console — Data safety (CardFlow)

Use this checklist when filling **App content → Data safety**.

## Data collected / shared

| Data type | Collected? | Shared? | Purpose | Optional? |
|-----------|------------|---------|---------|-----------|
| Email | Yes (account) | With Supabase / Google Sign-In | Account management | Required for account |
| Name | Yes (display name / Google) | With Supabase | Account | Optional |
| Photos / images | Yes (card scans, transient) | Sent to Cloudflare Worker → Gemini for OCR | App functionality | Required to scan cards |
| QR / barcode content | Yes (on device only) | No — parsed locally | App functionality | Optional (QR scan) |
| Device or other IDs | Yes (device id / AdMob AAID) | OCR Worker (rate limit); AdMob | Fraud prevention; Advertising | Required for those features |
| App activity / ads interactions | Via AdMob (free) | Google AdMob | Advertising | Only if ads shown |
| Purchase history | Via Play Billing | Google Play | App functionality | Optional (Pro) |

## Not collected by CardFlow cloud
- Full on-device contact list (local only)
- Precise location
- SMS / call logs
- Contacts list sync to CardFlow servers (v1)

## Security practices
- Data encrypted in transit (HTTPS)
- Users can request deletion (in-app **Delete account** + clear local data)
- Account deletion available in Settings → Privacy

## Privacy policy URL
`https://shy-fog-9658.shubhamanap02.workers.dev/`

## Terms URL
`https://shy-fog-9658.shubhamanap02.workers.dev/terms.html`

## After updating HTML
Re-upload `docs/pages-upload/index.html` and `terms.html` to your Cloudflare Pages / Worker host so the live URL matches the in-app policy.
