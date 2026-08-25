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
- Use a Windows-side emulator: install Android Studio with its SDK on the **Windows side**, then run `npx expo start` from a Windows terminal (not WSL2) so it can see `%LOCALAPPDATA%\Android\Sdk`. More fragile to bridge into WSL2 - see the next section before sinking time into this if it doesn't work immediately.

### Bridging a Windows-side Android Studio emulator into WSL2 (and when to give up on it)

The standard trick is: start the emulator in Android Studio on Windows, then run `adb -a nodaemon server start` in a **Windows** terminal (binds Windows' adb server to all interfaces instead of just localhost) and point WSL2's own `adb` at it via `ADB_SERVER_SOCKET=tcp:<windows-host-ip-from-wsl2>:5037` (the gateway IP from `ip route | grep default` inside WSL2). This can work, but first confirm the more fundamental thing it depends on: **WSL2's own automatic Windows↔WSL2 localhost port-forwarding actually has to be enabled** for this bridge to reach anything. Test this independently of the emulator entirely - start Metro (or any WSL2-side server) on a known port, then from a **Windows** browser try `http://localhost:<port>`. If that's refused, the bridge is a dead end no matter how correctly the adb side is configured - WSL2's forwarding is disabled or broken in that environment, and no amount of adb/ngrok tinkering fixes it. (This is a real, observed environment - not hypothetical - so don't assume it always works.) The fix for that specific problem is on the Windows/WSL side (checking `.wslconfig`'s `localhostForwarding` setting, or a `wsl --shutdown` to reset networking state) - both outside what this repo's own tooling can influence.

A WSL2-**native** emulator (the `/opt/android-sdk` setup above) sidesteps all of that bridging entirely, but needs real memory headroom: a stock AVD easily uses 2GB+ RSS, and that has to coexist with whatever IDE/editor is already running in the same VM. If `free -h` shows less than ~2.5GB available before starting the emulator, expect it to either fail to boot or get OOM-killed partway through - watch for it with `dmesg | grep -i "killed process"` if the emulator process disappears unexpectedly. Capping it (`-memory 1536`) helps some but isn't a substitute for actually having the headroom.

### Testing on a real device via Expo Go, when neither emulator path works

If both emulator paths are blocked (as above), a real phone over a tunnel is the fallback - but two real gotchas showed up doing this for the first time:

1. **`expo start --tunnel` may fail outright** with `CommandError: failed to start tunnel` - `@expo/ngrok` (the package Expo's CLI shells out to) can lag behind ngrok's own service requirements; ngrok's backend now rejects old agent versions (`ERR_NGROK_121`) for free accounts, and `@expo/ngrok`'s bundled binary can be that old even at its own latest release. Fix: download a current `ngrok` binary directly (`https://ngrok.com/download`), `ngrok config add-authtoken <your-token>` (free signup required - ngrok requires an authtoken for all use now, even ephemeral tunnels), and replace `@expo/ngrok`'s bundled binary at `node_modules/@expo/ngrok-bin-<platform>/ngrok` with it - `@expo/ngrok`'s own JS wrapper still calls it as a plain subprocess, so a newer binary works as a drop-in **only for `ngrok http <port>` run manually** (see next point; `@expo/ngrok`'s own config-writing code doesn't understand ngrok v3's config schema and will error on `--tunnel` specifically).
2. **Given that, skip `--tunnel` and drive ngrok yourself**: run Metro normally (`npx expo start --localhost`), separately run `ngrok http 8081`, and set `EXPO_PACKAGER_PROXY_URL=<the ngrok https URL>` when starting Metro - this is the (undocumented but still-supported) env var Expo's own `--tunnel` mode uses internally to make the manifest embed the tunnel's hostname correctly. Without it, Metro embeds its own local port into the bundle/asset URLs (e.g. `https://xxx.ngrok-free.dev:8081/...`), which isn't routable and manifests as an "incompatible SDK" or blank-screen error on the device that has nothing to do with the actual SDK version.
3. **"Project is incompatible with this version of Expo Go," even on the latest Play Store build**: Expo Go's Play Store release only supports the newest SDK line(s) - if your project is pinned to an SDK Play Store has already moved past, no amount of "update Expo Go" from the store fixes it. Get the exact matching build instead: `curl -s https://api.expo.dev/v2/versions/latest | jq '.data.sdkVersions["<major>.0.0"].androidClientUrl'` (or browse `https://github.com/expo/expo-go-releases/releases`) gives an official APK for that exact SDK - download it on the phone's own browser and install; it replaces the Play Store build in place (same package, properly signed) rather than installing alongside it.
4. **Free-tier ngrok tunnels are workable but not fully reliable** for a real Metro session - the manifest/status endpoints and even a full bundle transfer generally succeed, but the persistent WebSocket Metro uses for logging/HMR (`/message`) can drop and reconnect repeatedly, which can leave the client's own "bundling/downloading" progress UI stuck even after the underlying transfer actually completed. If a fresh app close/reopen and a fresh `ngrok`/Metro restart don't clear it, this is a real limitation of the free tier for this kind of long-lived-connection workflow, not something to keep retrying indefinitely - a paid ngrok plan or a working LAN/emulator path are the actual fixes.

### Making the tunnel setup durable, and two bugs it exposed

Running Metro and `ngrok` as one-off foreground processes (as above) works but doesn't survive a crash or an accidental `Ctrl+C` - and importing a native-module package unconditionally can crash Expo Go outright in a way no amount of tunnel-fiddling fixes. Both showed up resuming this exact setup later in the same project:

1. **Run Metro and the tunnel as real (`Restart=always`) services, not foreground shell processes.** A `systemd` unit (`ExecStart=npx expo start --localhost`, `Restart=always`, `RestartSec=2`) means a crash or a manual kill just comes back on its own within a couple seconds - genuinely useful given how often a bad reload can wedge Metro. One real trap this causes: **`EXPO_PACKAGER_PROXY_URL` (see above) must be a real process environment variable on that service, not a `.env.local` entry.** Metro's own `UrlCreator.js`/`env.js` deliberately read it from the *pre-dotenv* environment - specifically to stop a project's own `.env` file from being able to redirect connected clients to an attacker-controlled URL. Set it as an `Environment=` line in the unit file (`systemctl daemon-reload && systemctl restart <unit>` after editing) instead.
2. **The app hangs forever on "Bundling 99%...", with no error anywhere.** Expo Go requests the JS bundle with `Accept: ..., multipart/mixed` to drive its bundling-progress UI (see `metro/src/Server/MultipartResponse.js`'s `wrapIfSupported` - it streams a progress event, then the bundle, then a closing boundary, all in one HTTP response). A free-tier ngrok tunnel can deliver every byte of that (confirmed via `curl`+the tunnel's own request log at `http://127.0.0.1:4040/api/requests/http` showing the full byte count and a closed connection) while still never resolving cleanly on the client, which sits stuck waiting for a terminator that effectively never arrives. Fix: run a small local HTTP proxy in front of Metro that strips `multipart/mixed` back out of the incoming `Accept` header before forwarding - Metro's `wrapIfSupported` then falls back to a single plain (non-streamed, real `Content-Length`) response, which tunnels handle without issue. Point `ngrok` at the proxy's port instead of Metro's.
3. **ngrok's free plan only grants one reserved domain**, so the backend API can't get its own tunnel alongside Metro's (`ERR_NGROK_334: endpoint already online`) - and the mobile app needs to reach both once it gets past the splash screen. Since the backend's own routes already live under `/api/*` and Metro's dev-server paths (`/`, `/index.bundle`, `/status`, `/message`, `/inspector/*`, `/assets/*`) never do, one more tiny router in front of both (path starts with `/api/` → backend, else → Metro) lets a single shared tunnel serve both. Set the app's API base URL (its Settings screen) to that same tunnel's public URL.
4. **Never `import` a package with a native module at the top of a file that Expo Go also has to load** (`App.js`, or anything it imports eagerly). Several native-module packages (`@sentry/react-native` is one; `expo-notifications` is another, already guarded in `pushNotifications.js`) do a `TurboModuleRegistry.getEnforcing('SomeNativeModule')` call as an *import-time* side effect - which throws immediately if that module isn't compiled into the running Expo Go binary, crashing the whole app natively (`Fatal signal 11 (SIGSEGV)` in Android's Logcat, not a catchable JS error) before any error boundary can even mount. The fix is always the same shape: detect Expo Go (`Constants.executionEnvironment === ExecutionEnvironment.StoreClient` from `expo-constants`) and only `require()` the package - never `import` it - when that check is false, so the crashing native lookup never runs at all under Expo Go.
5. **This "Project is incompatible"/SDK-mismatch problem (see above) isn't specific to physical devices** - it recurs identically on an Android Studio emulator whenever its Play Store Expo Go auto-updates past the project's pinned SDK. Same fix, easier to apply on an emulator: download the exact matching build from `expo/expo-go-releases` and just drag the `.apk` file onto the running emulator window in Android Studio to install it (no `adb install`/sideload dance needed).

### Physical device can't reach the API

`localhost` from a phone refers to the phone itself, not your dev machine. See [Mobile App: Pointing the app at your backend](Keja-App#pointing-the-app-at-your-backend) — set your computer's LAN IP via the sign-in screen's API server settings.

## General

- Ran `npm install` at the repo root and a package still seems missing? The root `package.json` has no `workspaces` field — `npm install` there only installs the (dependency-free) root package itself, it does **not** fan out to `backend/`, `frontend/`, or `mobile/`. Each has its own `package.json` and needs its own install: `npm --prefix backend install` (repeat for `frontend`/`mobile`), or `cd` into the package and run `npm install` there directly. The root's `npm run dev`/`frontend`/`mobile`/`test`/`lint` scripts do fan out via `--prefix` — only `install` doesn't.
- Tests failing only in CI, not locally? Check whether the failure needs `TEST_MONGODB_URI` (CI sets it against a `mongo:7` service container; locally you need your own MongoDB instance running) — see [Testing](Testing#real-database-integration-tests).
