# Troubleshooting

## MongoDB

**SSL error on startup** (`tlsv1 alert internal error`, `SSL alert number 80`)

The app reached MongoDB Atlas but the TLS connection was rejected before Mongoose could authenticate. Check:

- Atlas Network Access includes your current public IP address.
- `MONGODB_URI` has the correct username, password, cluster host, and database path.
- Your VPN, firewall, or DNS isn't interrupting Atlas connections.
- `DB_REQUIRED=false` is set in `backend/.env` while developing locally, then restart `npm run dev`.

**Checking connectivity**

- `GET /api/health` — confirms whether the API is running, with `database.status` as `connected` or `disconnected`.
- `GET /api/health/database` — actively pings MongoDB. `200` = API and database linked; `503` = API running but MongoDB unreachable.

## Expo / Mobile

### Android emulator on WSL2

**`Error fetching your Android emulators! ... ~/Library/Android/sdk/emulator/emulator.exe`**

This means Expo CLI couldn't find an Android SDK/emulator — the suggested path is a generic macOS-style default and often isn't even right for your OS, so don't follow it literally.

If you're developing inside WSL2: install a native Android SDK + emulator directly inside the WSL2 distro (not the Windows side) at `/opt/android-sdk`, with `ANDROID_HOME`/`ANDROID_SDK_ROOT`/`PATH` set in `~/.bashrc`. Open a new terminal (or `source ~/.bashrc`), then:

```bash
emulator -avd kejaapp_avd -no-window -no-audio -gpu swiftshader_indirect &
```

Wait for `adb devices` to show it as `device` (not `offline`), then run `npx expo start` and press `a` — Expo CLI finds it via `ANDROID_HOME` and loads the app into Expo Go automatically. Drop `-no-window` to see the emulator's screen (needs an X server/WSLg on the Windows side); headless is fine for just running/testing.

**Alternatives, if you'd rather not run a WSL2-side emulator:**
- Skip the emulator entirely: press `w` for the web preview, or scan the QR code with **Expo Go** on your phone (same Wi-Fi network as your PC).
- Use a Windows-side emulator: install Android Studio with its SDK on the **Windows side**, then run `npx expo start` from a Windows terminal (not WSL2) so it can see `%LOCALAPPDATA%\Android\Sdk`. More fragile to bridge into WSL2.

### Physical device can't reach the API

`localhost` from a phone refers to the phone itself, not your dev machine. See [Mobile App: Pointing the app at your backend](Keja-App#pointing-the-app-at-your-backend) — set your computer's LAN IP via the sign-in screen's API server settings.

## General

- Ran `npm install` at the repo root and a package still seems missing? The root `package.json` has no `workspaces` field — `npm install` there only installs the (dependency-free) root package itself, it does **not** fan out to `backend/`, `frontend/`, or `mobile/`. Each has its own `package.json` and needs its own install: `npm --prefix backend install` (repeat for `frontend`/`mobile`), or `cd` into the package and run `npm install` there directly. The root's `npm run dev`/`frontend`/`mobile`/`test`/`lint` scripts do fan out via `--prefix` — only `install` doesn't.
- Tests failing only in CI, not locally? Check whether the failure needs `TEST_MONGODB_URI` (CI sets it against a `mongo:7` service container; locally you need your own MongoDB instance running) — see [Testing](Testing#real-database-integration-tests).
