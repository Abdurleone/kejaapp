# Mobile App

A React Native (Expo) app for iOS and Android, sharing the same backend API as the web frontend.

For the canonical, most up-to-date version of this page, see [mobile/README.md](https://github.com/Abdurleone/jakezapp/blob/main/mobile/README.md) in the repo.

## Why Expo

Targeting both iOS and Android from one JS codebase, without needing Xcode/Android Studio installed locally:

- **Expo Go** (free app on the App Store / Play Store) — scan a QR code, run the app live on your own phone during development.
- **EAS Build** (Expo's cloud build service) — produces real installable `.ipa`/`.apk`/`.aab` files without a local Mac for iOS.

If you do have Xcode/Android Studio, `npm run ios` / `npm run android` work as usual and build directly to a simulator/emulator.

## Current scope

**Implemented:** auth (register/login/sign out/session, roles: tenant/landlord/agency/mover/admin), bottom navigation with only 2 pinned tabs per role — Dashboard plus that role's one signature feature (Discover for tenants, Workspace for landlord/agency, Movers for movers, Admin for admins) — plus a third **More** tab whose menu lists every other role-visible screen (icon, label, an unread-count badge on Notifications), tapping a row pushes that screen while More stays highlighted as active (an iOS-style "More tab", replacing what used to be up to 8 tabs crammed onto the bar for a single role), a role-aware Dashboard (first landlord/agency/admin-facing screen on mobile; also shows mover verification status and received-request counts), Discover (anonymous browsing, radius/"Near me" search, "Verified agency" badge on agency-owned listings; property detail requires signing in — landlords/agencies only see full details for listings they own, movers are excluded entirely as transportation facilitators who work from requests/notifications instead), saved favorites (More → Saved for tenants), inquiries (send + view responses), viewing requests (scheduled/open + status), an owner/agency Workspace tab with a Listings/Inquiries segmented view (Listings: list own properties, infinite-scroll paginated, create a new listing with photo selection built into the same form — multi-select via `expo-image-picker`, uploaded in a batch right after creation — and tap into an edit screen to update a listing or add/remove its photos afterward; Inquiries: reply to or close inquiries tenants send about your listings), Movers (filterable mover directory with a "Request service" action for tenants — which shares device location so the mover sees a pickup-to-dropoff distance on the request — and affiliate management for landlords/agencies; movers instead see their own profile-status panel plus received requests, each showing that distance, with accept/decline/complete actions — pinned for the mover role, reached via More for everyone else) plus a "Movers for this move" section on the property detail screen (owner's affiliates + verified movers nearby), Feedback (More → Feedback; submit as tenant/landlord/agency/mover, respond as admin), Notifications (More → Notifications; All/Unread filter, mark as read, plus an unread-count badge on the Notifications row and on the More tab itself), an Admin tab for the admin role (Users: search/filter/drill-in/status-change; Reviews: read-only property/tenant/rating/comment/owner-response list — no moderation action, per the Terms of Service), saved-search management on the Account screen (More → Account), push notifications (Expo push service — registers/unregisters a device token around sign-in/sign-out; requires a development build to actually receive pushes, since Expo Go on Android doesn't support them as of SDK 53+), a light/dark mode toggle (icon-only, top-right of every screen, persisted via AsyncStorage), a branded gradient Sign In screen, and one-tap call/email/WhatsApp contact actions on a property's contact details.

**Not yet built** (also missing on web, or web-only so far — not a mobile-specific regression): a property reviews UI (backend supports it, but no review list/composer on mobile yet).

## Running it

```bash
npm run mobile          # from the repo root
```

or directly:

```bash
cd mobile
npm install
npx expo start
```

This starts Metro and prints a QR code:
- `w` — browser preview (native-only APIs like the date picker fall back to plain text there).
- Scan the QR with **Expo Go** (same Wi-Fi network as your dev machine).
- `a` / `i` — Android emulator / iOS simulator, if installed.

## Pointing the app at your backend

The app needs to reach `../backend` (`npm run dev`, port 5000 by default). Where `localhost` points depends on what's running the app:

| Target | Correct host |
|---|---|
| iOS Simulator | `http://localhost:5000` (default) |
| Android Emulator | `http://10.0.2.2:5000` (default — the emulator's alias for the host machine) |
| Physical device via Expo Go | `http://<your-computer's-LAN-IP>:5000` — set manually |
| Web preview (`w`) | `http://localhost:5000` (default) |

For a physical device, in a development build (this toggle is hidden in production via `__DEV__`): sign-in screen → **Show API server settings** → enter your computer's LAN IP (e.g. `http://192.168.1.20:5000`, from `ipconfig`/`ifconfig`). Persists on-device across restarts. CORS only applies to browser `fetch`, so no backend config change is needed for native iOS/Android — only for the web preview target if you change its origin.

**Demo accounts:** same as the backend — see [Getting Started](Getting-Started#seed-demo-data).

## Producing a real build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

Runs in Expo's cloud, so the iOS build works without a local Mac. First run creates `eas.json` and asks for bundle identifiers (already set in `app.json` as `com.jakezapp.mobile`). See [Expo's EAS Build docs](https://docs.expo.dev/build/introduction/) for store submission steps.

## Troubleshooting

**`Error fetching your Android emulators!` / can't find the SDK**

The suggested path in Expo's error is often a generic macOS-style default and may not even apply to your OS — don't follow it literally. If you're on WSL2, see [Troubleshooting](Troubleshooting#android-emulator-on-wsl2) for the in-WSL2 Android SDK setup used for this project.

**Physical device can't reach the API / requests hang**

`localhost` from a phone refers to the phone itself, not your dev machine — see "Pointing the app at your backend" above.

**Not receiving push notifications**

Since Expo SDK 53, push notifications don't work in Expo Go on Android at all — a development build (`eas build --profile development` or `npx expo run:android`) is required there. iOS Expo Go and the web preview aren't affected by that specific restriction, though push isn't supported on web regardless. Also check that an EAS project is configured (`extra.eas.projectId` in `app.json`/`eas.json`) — without it, push registration silently no-ops rather than erroring.

## Verification notes

Developed and verified end-to-end via the Expo web preview driven with Playwright against a real running backend (sign-in, browsing, saving a favorite, submitting an inquiry — real network responses, not mocks). Also verified on a real Android emulator (API 34, Google APIs x86_64) via Expo Go, navigating Discover → property detail with real backend data and native navigation.

The pinned-tabs-plus-More bottom nav was verified live on the same Android emulator, signed in as a landlord: confirmed the bar shows only Dashboard/Workspace/More (down from 6 tabs), that More opens a menu listing Movers/Notifications/Feedback/Account, and that tapping a row pushes the real screen while More stays highlighted as active.

**Not yet verified** on an actual iOS device/simulator — iOS Simulator requires macOS/Xcode, unavailable in a Linux/WSL2 dev environment. Do this before shipping to the App Store, since iOS-specific behavior (safe-area insets, native navigation gestures) can't be exercised any other way.
