# Play launch — Billing + AdMob + Closed testing

Package: `com.shubhamanap.cardflow`  

Pro subscriptions (Play Console → **Monetize → Products → Subscriptions**):

| Product ID | Billing |
|------------|---------|
| `cardflow_pro_monthly` | Monthly |
| `cardflow_pro_yearly` | Yearly |

## 1. Play Console — subscriptions

1. Play Console → your app → **Monetize → Products → Subscriptions**
2. Create **exactly**:
   - `cardflow_pro_monthly` (1 month base plan)
   - `cardflow_pro_yearly` (1 year base plan)
3. Name/description: CardFlow Pro — unlimited scans, no ads, Excel export, cloud assist
4. Set prices → **Activate** both
5. (Optional) Deactivate old one-time product `cardflow_pro` if it still exists

License testing: Settings → License testing → add tester Gmails for free test purchases.

## 2. AdMob — app + ad units

1. [AdMob](https://admob.google.com) → Apps → Add app → Android package `com.shubhamanap.cardflow`
2. Copy **App ID** (`ca-app-pub-XXXX~YYYY`)
3. Create ad units: Banner, Interstitial, Rewarded
4. Set EAS production env for AdMob + Supabase public keys (see earlier notes)

## 3. Backend / legal before AAB

- [ ] Redeploy OCR Worker — `GET /health`
- [ ] Redeploy privacy Worker after terms update (`node server/build-privacy-worker.cjs`)
- [ ] Run delete-account SQL in Supabase
- [ ] Privacy + Terms URLs open in browser

## 4. Build AAB

```bash
cd CardFlow
npm run check
npx eas-cli build --platform android --profile production --non-interactive
```

Upload **AAB** → Closed testing.

## 5. Closed testing checklist

- [ ] Sign up / Google / email verify
- [ ] Privacy & terms once after first sign-in
- [ ] Scan + save contact
- [ ] Free ads + scan limit → rewarded ad OR Pro monthly/yearly
- [ ] Settings: Free → **Upgrade** (Monthly / Yearly)
- [ ] Settings: Pro → **Manage** → Google Play subscriptions
- [ ] Cancel / expire → returns to Free after sync
- [ ] Delete account
- [ ] No crashes / ANRs

## 6. Production

Promote when healthy. Monitor Play Vitals + OCR quota.
