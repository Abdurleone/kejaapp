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
- Discover: anonymous property browsing, radius ("Near me") search, property detail
- Saved favorites: save/unsave, saved list
- Inquiries: send an inquiry from a property, view your inquiries and any owner response
- Viewing requests: request a scheduled or open viewing, view your requests and their status

Not yet built (still placeholders on the web frontend too, so this isn't a regression):
- Owner/agency listing management workspace
- Admin moderation console
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

For a physical device, open the app, go to the sign-in screen, tap **Show API server settings**, and enter your computer's LAN IP (e.g. `http://192.168.1.20:5000`, found via `ipconfig`/`ifconfig`). This is stored on-device and persists across restarts. Make sure the backend's `CORS_ORIGIN` doesn't need updating — CORS only applies to browser `fetch`, not native app requests, so no backend config changes are needed for iOS/Android, only for the web preview target if you change its origin.

### Demo accounts

Same seeded accounts as the backend (see the root README), e.g. `tenant@example.com` / `password123`.

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
    ├── api/                 # apiFetch client + domain functions (auth, properties, favorites, inquiries, viewings)
    ├── components/          # Shared UI (PropertyCard, LoadingView, MessageView, Skeleton + skeleton lists)
    ├── context/             # AuthContext (session), SettingsContext (API base URL)
    ├── navigation/           # Root stack, bottom tabs, Discover stack
    ├── screens/              # auth/, discover/, saved/, requests/, account/
    ├── theme/                # Shared color tokens (mirrors frontend/styles.css palette)
    └── utils/                # Formatting helpers (currency, status labels)
```

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

## Verification notes

This was developed and verified end-to-end via the Expo web preview (`expo start --web`) driven with Playwright against a real running backend — including sign-in, browsing, saving a favorite, and submitting an inquiry, all confirmed via real network responses from the API, not mocks.

It has since also been verified on a real Android emulator (API 34, Google APIs x86_64 image) via Expo Go: launched from the Metro bundler already running on the dev machine, loaded the JS bundle, and navigated Discover → property detail, rendering real backend data (pricing, cost summary, contact info) with native navigation (back button, bottom tabs). This confirms the app runs as an actual native Android app, not just in the web preview.

Still not verified on an actual iOS device/simulator — iOS Simulator requires macOS/Xcode, which isn't available in this Linux/WSL2 dev environment. Do that before shipping to the App Store, since iOS-specific behavior (safe-area insets on notched devices, iOS-native navigation gestures) can't be exercised any other way from here.
