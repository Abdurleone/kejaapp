# KejaApp Mobile

A React Native (Expo) app for iOS and Android, sharing the same backend API as the web frontend in `../frontend`.

## Why Expo

This app targets both iOS and Android from one JavaScript codebase. Using Expo specifically means you can develop and test it without Xcode or Android Studio installed locally:

- **Expo Go** (a free app on the App Store / Play Store) lets you scan a QR code and run the app live on your own phone during development.
- **EAS Build** (Expo's cloud build service) produces real installable `.ipa`/`.apk`/`.aab` files without needing a local Mac for iOS.

If you do have Xcode or Android Studio installed, `npm run ios` / `npm run android` work as usual and build directly to a simulator/emulator.

## Current scope (MVP)

Implemented:
- Auth: register, login, sign out, current-user session
- Role-aware Dashboard: the default tab after sign-in, showing unread notifications plus role-specific summary counts (tenant activity; owner listings for landlord/agency/admin; agency verification status; mover verification status and received-request counts; admin platform-moderation counts, including mover verifications) — the first landlord/agency/admin-facing screen on mobile
- Discover: anonymous property browsing, radius ("Near me") search plus type/bedrooms/rent-range filters, property detail
- Saved favorites: save/unsave, saved list
- Inquiries: send an inquiry from a property, view your inquiries (infinite-scroll paginated) and any owner response
- Viewing requests: request a scheduled or open viewing, view your requests (infinite-scroll paginated) and their status
- Owner/agency Workspace tab: a Listings/Inquiries/Viewing requests segmented view. Listings lists the signed-in landlord/agency's own properties (`fetchMyProperties`, infinite-scroll paginated) with a "New listing" action (`POST /api/properties`, photo selection embedded in the same form, previewed locally and uploaded right after creation) and tapping a property opens an edit screen (`PUT /api/properties/:id`, shares its form logic with create via `propertyForm.js`) where photos can also be added/removed afterward. Inquiries lists inquiries tenants have sent about your listings (`GET /api/inquiries/received`, infinite-scroll paginated) with a reply-or-close action (`PUT /api/inquiries/:id`). Viewing requests lists incoming viewing requests across all your properties in one place (`GET /api/viewings/received`) with an approve/reject action (`PUT /api/viewings/:id/status`) — previously only possible via a raw API call. Gated so tenants see a sign-in/role message instead.
- Notifications tab: lists all notifications with an All/Unread filter, a "Mark as read" action per item, and a "Mark all as read" bulk action (shown only when something is actually unread). Read state only changes via one of these explicit actions — the screen itself never marks anything read just by being viewed. Actionable notifications (a `mover_request` for the addressed mover, a `viewing`/`inquiry` for the addressed property owner) also show a "View request" action that navigates to the Movers or Workspace tab with the specific card highlighted and marks the notification read as a side effect.
- Saved searches: a "Save search" action on Discover once a location is set (tenants), carrying forward any active type/bedrooms/rent-range filters alongside the location, and a list to review/remove them on the Account tab.
- Movers tab: a filterable mover directory (service type, county) for tenants/landlords/agencies/anonymous visitors, with a "Request service" action (tenants, requiring a home-size selection) and an affiliate add/remove action (landlord/agency); signed-in movers instead see their own profile-status panel plus received tenant requests — each showing the tenant's home size and, once a pickup distance is known, the same computed price estimate the tenant saw — with accept/decline/complete actions. The property detail screen also shows a "Movers for this move" section (the owner's affiliates plus verified movers nearby) with the same request action — since the property's drop-off location is known there, submitting also shows a price estimate weighing distance against home size.
- "Verified agency" badge next to a listing's owner on Discover property cards and the property detail screen, once that agency's verification is approved.
- Push notifications: registers/unregisters an Expo push token around sign-in/sign-out; every notification above also arrives as a push notification if the device is registered. Requires a development build to actually receive pushes — Expo Go on Android doesn't support them as of SDK 53+ (see Troubleshooting).
- Light/dark mode toggle: an icon-only sun/moon control in the top-right header of every screen (`ThemeContext`, persisted to AsyncStorage) — replaces the old inline "Dark mode" switch that used to live on the Account screen only.
- Property detail is gated to signed-in tenants: anonymous visitors and non-tenant roles get a "sign in with a tenant account" prompt instead of pricing/contact info; the Discover list itself stays open to everyone. Contact details include one-tap call/email/WhatsApp actions plus a "Contact via {method}" shortcut for the owner's preferred method.
- Sign In screen has a branded gradient hero matching the landing page; the "Show API server settings" toggle is hidden in production builds (only visible in development, via `__DEV__`).
- Admin tab (admin role only): Users segment (search/role filter, paginated list, drill into a user for account summary, status history, and an active/suspended/banned status-change form) and a read-only Reviews segment (property, tenant, rating, comment, owner response, date) — deliberately no delete/moderate action, matching the backend (and web admin console), since reviews can't be moderated per `docs/terms-of-service.md`.

Not yet built (still placeholders on the web frontend too, so this isn't a regression):
- Property reviews UI (the backend supports it; the property detail screen shows the rating summary but not a review list/composer yet)

## Running it

From the repo root:

```bash
npm run mobile
```

Or directly:

```bash
cd mobile
npm install
npx expo start
```

This starts the Metro bundler and prints a QR code. Options from there:
- Press `w` to open a browser preview (`react-native-web` — useful for a quick UI check, but native-only APIs like the date picker fall back to a plain text input there).
- Scan the QR code with the **Expo Go** app on your phone (same Wi-Fi network as your dev machine).
- Press `a` / `i` to launch an Android emulator / iOS simulator if you have Android Studio / Xcode installed.

### Pointing the app at your backend

The app needs to reach the backend from `../backend` (`npm run dev` from the repo root, listening on port 5000 by default). Where "localhost" points depends on what's running the app:

| Target | Correct host |
|---|---|
| iOS Simulator | `http://localhost:5000` (default) |
| Android Emulator | `http://10.0.2.2:5000` (default — the emulator's alias for the host machine) |
| Physical device via Expo Go | `http://<your-computer's-LAN-IP>:5000` — must be set manually |
| Web preview (`w`) | `http://localhost:5000` (default — runs in a real browser on the same machine) |

For a physical device, run the app in a development build or Expo Go's dev client, go to the sign-in screen, tap **Show API server settings** (only visible when `__DEV__` is true, i.e. not in production builds), and enter your computer's LAN IP (e.g. `http://192.168.1.20:5000`, found via `ipconfig`/`ifconfig`). This is stored on-device and persists across restarts. Make sure the backend's `CORS_ORIGIN` doesn't need updating — CORS only applies to browser `fetch`, not native app requests, so no backend config changes are needed for iOS/Android, only for the web preview target if you change its origin.

### Demo accounts

For the shared seeded demo accounts and password reference, see **[docs/demo-credentials.md](../docs/demo-credentials.md)**.

## Producing a real installable build

Once you're ready for an actual `.ipa` or `.apk`/`.aab` (e.g. to install on a device outside Expo Go, or submit to an app store):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

`eas build` runs in Expo's cloud, so it works without a local Mac even for the iOS build. Follow the prompts — first run creates an `eas.json` and asks for bundle identifiers (already set in `app.json` as `com.kejaapp.mobile`, feel free to change before your first submission). See [Expo's EAS Build docs](https://docs.expo.dev/build/introduction/) for store submission steps.

## Project structure

```text
mobile/
├── App.js                   # Providers + navigation root
├── app.json                 # Expo config (name, icons, bundle ids)
├── assets/                  # App icons/splash, generated from frontend/assets/keja-logo.png
└── src/
    ├── api/                 # apiFetch client + domain functions (auth, properties, favorites, inquiries, viewings, movers, admin)
    ├── components/          # Shared UI (PropertyCard, LoadingView, MessageView, Skeleton + skeleton lists, ColorModeToggle)
    ├── context/             # AuthContext (session), SettingsContext (API base URL), ThemeContext (light/dark mode)
    ├── navigation/           # Root stack, bottom tabs (roleTabs.js), Discover/Workspace/Movers/Admin stacks
    ├── screens/              # auth/, dashboard/, discover/, saved/, workspace/, movers/, requests/, account/, admin/
    ├── theme/                # Shared color tokens (mirrors frontend/styles.css palette; light + dark variants)
    └── utils/                # Formatting helpers (currency, status labels), contact.js (tel:/mailto:/wa.me link builders)
```

## Testing

`npm test` (Jest + React Native Testing Library, `jest-expo` preset; 31 suites, 167 tests). Coverage spans:
- Pure-function modules: `screens/workspace/propertyForm.js`, `navigation/roleTabs.js`, `utils/format.js`.
- Context providers: `ThemeContext`, `SettingsContext` (plus its standalone `resolveAssetUrl` helper), `AuthContext` (session restore, login/register/logout, push-registration wiring) — each with a small test-consumer component rather than mocking React internals.
- Every bottom-tab screen and its sub-screens (RNTL render tests, with `../api/index.js` and the relevant context hooks mocked): `DashboardScreen`/`LandingView`, `DiscoverScreen` and its sub-screens (`PropertyDetailScreen`, `InquiryFormScreen`, `ViewingRequestFormScreen`, `MoverRequestFormScreen`), `SavedScreen`, `WorkspaceScreen`/`PropertyEditScreen`, `MoversScreen` (directory and mover-dashboard views), `RequestsScreen`, `NotificationsScreen`, `FeedbackScreen` (submitter and admin-responder views), `AccountScreen`, `AdminScreen`/`AdminUserDetailScreen`, and the auth screens (`LoginScreen`, `RegisterScreen`).
- Real (non-mocked) `setTimeout`-based debounce behavior, isolated into its own file per screen (`MoversScreen.debounce.test.js`, `AdminScreen.debounce.test.js`) rather than mixed into a screen's main synchronous test file — a stray timer callback from one test was found to leak into and corrupt a later, unrelated test otherwise.

`eslint`/`jest` are deliberately pinned below their next major version in `package.json` (and blocked from auto-updating via `.github/dependabot.yml`'s `ignore` rules) — `eslint-config-expo`'s vendored `eslint-plugin-react` doesn't support `eslint@10` yet, and this RN version's `@react-native/jest-preset` doesn't support `jest@30` yet. This has already regressed twice via an auto-merged Dependabot bump; don't lift the ignore rule without confirming both are actually compatible first.

A real gotcha found while writing these: under this React 19 + `jest-expo` + RNTL combination, firing two `fireEvent.press` calls back-to-back with no `waitFor`/flush in between can corrupt the *next* test's render (it comes back as an empty tree) even though the two tests are otherwise unrelated. Every multi-interaction test here flushes (`await waitFor(...)`) after each `fireEvent` call rather than chaining them synchronously.

## Troubleshooting

**`Error fetching your Android emulators! ... ~/Library/Android/sdk/emulator/emulator.exe`**

This means Expo CLI couldn't find an Android SDK/emulator on your machine — the suggested path is a generic macOS-style default and often isn't even right for your OS, so don't follow it literally.

A native Android SDK + emulator is now installed directly inside this WSL2 distro (not the Windows side), at `/opt/android-sdk`, with `ANDROID_HOME`/`ANDROID_SDK_ROOT`/`PATH` set in `~/.bashrc`. Open a new terminal (or `source ~/.bashrc`) so the exports take effect, then:

```bash
emulator -avd kejaapp_avd -no-window -no-audio -gpu swiftshader_indirect &
```

Wait for `adb devices` to show it as `device` (not `offline`), then run `npx expo start` and press `a` — Expo CLI will find it via `ANDROID_HOME` and load the app into Expo Go automatically. Drop `-no-window` if you want to see the emulator's screen (needs an X server/WSLg on the Windows side); headless is fine for just running/testing the app.

Other options, if you'd rather not run a WSL2-side emulator:

- **Skip the emulator entirely:** press `w` for the web preview, or scan the QR code with the **Expo Go** app on your phone (same Wi-Fi network as your PC).
- **Use a Windows-side emulator instead:** install Android Studio with its SDK on the **Windows side**, then run `npx expo start` from a Windows terminal (not WSL2) so it can see `%LOCALAPPDATA%\Android\Sdk`. More fragile to bridge into WSL2, so the in-WSL2 SDK above is simpler if you're driving everything from a WSL2 terminal.

**Physical device can't reach the API / requests hang or fail**

See [Pointing the app at your backend](#pointing-the-app-at-your-backend) above — `localhost` from a phone refers to the phone itself, not your dev machine. Set the LAN IP via the sign-in screen's API server settings.

**Not receiving push notifications**

Since Expo SDK 53, push notifications don't work in Expo Go on Android at all — you need a development build (`eas build --profile development` or `npx expo run:android`) to test them there. iOS Expo Go and the web preview aren't affected by this specific restriction, though push isn't supported on web regardless (see Core Features above). Also check that an EAS project is configured (`extra.eas.projectId` in `app.json`/`eas.json`) — without it, `registerForPushNotifications()` silently no-ops rather than erroring.

## Verification notes

This was developed and verified end-to-end via the Expo web preview (`expo start --web`) driven with Playwright against a real running backend — including sign-in, browsing, saving a favorite, and submitting an inquiry, all confirmed via real network responses from the API, not mocks.

It has since also been verified on a real Android emulator (API 34, Google APIs x86_64 image) via Expo Go: launched from the Metro bundler already running on the dev machine, loaded the JS bundle, and navigated Discover → property detail, rendering real backend data (pricing, cost summary, contact info) with native navigation (back button, bottom tabs). This confirms the app runs as an actual native Android app, not just in the web preview.

Still not verified on an actual iOS device/simulator — iOS Simulator requires macOS/Xcode, which isn't available in this Linux/WSL2 dev environment. Do that before shipping to the App Store, since iOS-specific behavior (safe-area insets on notched devices, iOS-native navigation gestures) can't be exercised any other way from here.
