# Play Store launch checklist (Phase B)

See the full path (Billing + AdMob + AAB + Closed testing): [`PLAY_LAUNCH.md`](./PLAY_LAUNCH.md)

Package: `com.shubhamanap.cardflow`  
Privacy: [`privacy-policy.html`](./privacy-policy.html) · live URL in [`PLAY_DATA_SAFETY.md`](./PLAY_DATA_SAFETY.md)

## Before submit
1. Host privacy/terms (already on shy-fog Worker — redeploy after legal edits)
2. Play Console store listing + content rating + Data safety + ads declaration
3. Create in-app product `cardflow_pro` and AdMob units (see PLAY_LAUNCH.md)
4. Set EAS production env for AdMob + Supabase

## Build & upload
```bash
cd CardFlow
npm run check
npx eas-cli build --platform android --profile production --non-interactive
```
Upload the **AAB** to Play Console → **Closed testing** first.

## Closed test
- 12+ license testers; verify scan, ads, rewarded, Pro buy/restore, delete account

## Production
- Promote when closed test is healthy; monitor ANRs and Gemini quota
