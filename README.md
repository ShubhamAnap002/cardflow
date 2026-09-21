# CardFlow

Business-card scanner built with Expo SDK 57, React Native and expo-router. Contacts, groups and
your own shareable card live in AsyncStorage on the device — there is no backend.

## Run locally

```bash
npm install
npm run start       # then press "a" for Android, or scan the QR code
npm run android     # open straight onto a connected device/emulator
npm run typecheck   # tsc --noEmit
```

Camera and photo-library access come from `expo-image-picker`, so the scan flow needs a
development build or a store build — Expo Go is fine for everything else.

## Layout

```
src/
  app/                    expo-router routes
    (tabs)/               Home · Contacts · Groups · Settings (+ centre Scan button)
    scan.tsx              camera/gallery sheet (transparent modal)
    review.tsx            processing beat, then confirm the extracted fields
    contact/[id].tsx      contact details
    edit.tsx              edit a contact (modal)
    profile.tsx           edit your own card (modal)
  components/             AppHeader, ContactCard, GroupCard, PrimaryButton, Chip, Icon, …
  constants/theme.ts      colours, spacing, radii, type ramp, shadows
  lib/storage.ts          profile/contacts/groups CRUD + demo seed data
```

Icons are glyphs from Material Symbols (`@expo-google-fonts/material-symbols`), loaded once in
`src/app/_layout.tsx`, so there is no icon-library dependency.

## Build for Play

```bash
npx eas-cli build --platform android --profile production   # AAB, autoIncrement versionCode
npx eas-cli submit --platform android
```

`app.json` holds the version (`1.1.0`), package name `com.shubhamanap.cardflow` and the Android
permissions Play needs (`CAMERA`, `READ_MEDIA_IMAGES`); `eas.json` sets `buildType: app-bundle`
for the production profile.
