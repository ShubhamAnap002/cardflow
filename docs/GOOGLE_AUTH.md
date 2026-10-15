# Enable Google login (Supabase + CardFlow)

App scheme redirect: `cardflow://auth/callback`

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials  
2. Create **OAuth client ID** → type **Web application**  
3. Authorized redirect URIs — add exactly:

```
https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback
```

4. Copy **Client ID** and **Client Secret**

## 2. Supabase dashboard

1. **Authentication → Providers → Google** → Enable  
2. Paste Client ID + Client Secret → Save  
3. **Authentication → URL Configuration → Redirect URLs** — add:

```
cardflow://**
cardflow://auth/callback
```

For Expo Go testing you can also add:

```
exp://**
```

## 3. App `.env` (already needed)

```
EXPO_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

## 4. SQL

Run / re-run [`supabase-schema.sql`](./supabase-schema.sql) so new Google users get a `profiles` row.

## Branding (“Continue with Supabase” → CardFlow)

Google’s consent screen name/logo come from **Google Cloud → Google Auth Platform → Branding** (or APIs & Services → OAuth consent screen), **not** from the CardFlow app or Supabase Auth Site URL.

1. Set **App name** to `CardFlow` and upload a logo  
2. Add privacy / terms URLs (e.g. your hosted Worker pages) and support email  
3. Publish / verify the consent screen if Google requires it for external users  

If Google asks you to verify ownership of the privacy URL host (`shy-fog-9658….workers.dev`), use **Search Console → HTML tag**. Paste the `content=` token into `.env` as `GOOGLE_SITE_VERIFICATION`, run `node server/build-privacy-worker.cjs`, redeploy Worker `shy-fog-9658`, then Verify. See [`OPS.md`](./OPS.md) (Privacy / Terms Worker).

A Supabase **custom Auth domain** is optional: it only changes the URL bar from `*.supabase.co` to your domain. It is **not** required to show “CardFlow” on the Google consent screen.

## Notes

- Google button uses OAuth in an in-app browser, then returns to `cardflow://…`  
- Contacts stay on-device; only account email / plan / OCR quota sync via `profiles`  
- Production APK needs the `cardflow` scheme (already in app config)

## Email signup (verify first)

1. Supabase → **Authentication → Providers → Email** → enable **Confirm email**  
2. App flow: Create account → “Verify your email” screen → user opens link → **Sign in** with email/password  
3. Google remains **Sign in with Google** (no email verify step)  
