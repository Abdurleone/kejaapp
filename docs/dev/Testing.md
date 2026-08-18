# Testing

Each package (`backend/`, `frontend/`, `mobile/`) has its own test suite and ESLint flat config.

## Running tests

```bash
npm test                # everything: backend, frontend, mobile
npm run test:backend
npm run test:frontend
npm run test:mobile
```

## Linting

```bash
npm run lint             # everything
npm run lint:backend
npm run lint:frontend
npm run lint:mobile
```

## Backend tests

Uses Node's built-in `node:test` runner (no Jest/Mocha). Covers:

- Route handlers and middleware, driven through the real Express app over real HTTP via [supertest](https://github.com/ladjs/supertest) (`tests/app.test.js`) — auth/validation guard-rail cases, no live database needed.
- `middlewares/csrfProtection.js` directly — safe vs. unsafe methods, with/without an `Authorization` header, with/without the session or refresh cookie, and the `POST /api/auth/refresh` body-token exception.
- Controllers (auth, properties, favorites, inquiries, viewing requests, reviews, feedback, admin, saved searches, device tokens) — including `deleteProperty`'s cascade cleanup (inquiries/viewing requests/reviews/favorites/image fingerprints/mover requests, plus uploaded image files) and the equivalent fix in account deletion.
- Models and schema validation.
- Services (notifications, push notifications, saved-search matching, cost calculations, image fingerprints, and `userDeletionService`'s `deleteUserCascade` — the full account-deletion cascade extracted out of `authController.deleteCurrentUser` so it can also back the admin-only `DELETE /api/admin/users/:id`, tested from both call sites).
- `backend/scripts/cleanupTestData.js`'s account-identification logic (`tests/scripts/`) — pure-function tests confirming every real `seedDemoData.js` account is protected and an ad-hoc QA/test account isn't, independent of the actual DB-connecting script.
- Scheduled jobs (`backend/tests/jobs/`) — each sweep's idempotency (skips records it already processed) is asserted directly.
- Password hashing and token utilities.
- Admin moderation and agency verification workflows.

Most tests mock Mongoose model methods directly (`mock.method(User, "findOne", ...)`) via the `describe`/`it`/`mock` helpers in `backend/tests/helpers/nodeTestCompat.js`.

### Real-database integration tests

`backend/tests/integration/apiFlows.integration.test.js` and `backend/tests/integration/mongodb.integration.test.js` exercise the app over real HTTP against a real MongoDB — registration/login (including the username-conflict-with-suggestions flow), property CRUD, inquiries, viewing requests, reviews/ratings, favorites, and platform feedback. These are **opt-in**: they skip themselves unless `TEST_MONGODB_URI` is set.

```bash
TEST_MONGODB_URI="mongodb://127.0.0.1:27017" TEST_MONGODB_DB_NAME=jakezapp_test npm run test:backend
```

CI runs this automatically against a `mongo:7` service container on every push/PR.

## Frontend tests

Two tracks, run together by `npm test`:

**`node:test`** (`npm run test:node`), covering:

- API helper utilities (`apiFetch`, token management, URL building, error/`suggestions` passthrough).
- Frontend utilities (formatting, role checks, view routing, property filters).
- Page component integration for most pages — source-regex assertions (`readSource` + `assert.match` against the raw `.jsx` text) rather than full DOM rendering. See `frontend/tests/page-components.test.js` for the pattern. Only proves a string exists in the source, not that the component behaves correctly at runtime — see the `Next` list on [Roadmap](Roadmap#next) for which pages still only have this level of coverage.

**Vitest + jsdom + React Testing Library** (`npm run test:render`, 24 files, 171 tests), real render + interaction tests for every page the original appraisal flagged as regex-only-tested, plus `DiscoverPage`/`PropertyDetailPage`/`AuthModal` from the first Vitest introduction: `DiscoverPage` (including a stale-response race-condition regression test), `PropertyDetailPage`, `AuthModal` (dialog semantics, initial focus, Tab focus trap, Escape-to-close, a password show/hide toggle, and a confirm-password mismatch check on registration), `SavedPage` (including its empty-state "Browse listings" button), `DashboardPage` (every role-specific summary section: tenant/owner/agency/mover/admin), `WorkspacePage` (listings/inquiries, edit action, inquiry reply/close, and the listing status pill's color coding), `MoversPage` (directory filtering/affiliates/requests plus the mover's own dashboard), `FeedbackPage` (submitter and admin-responder views), `AccountPage` (profile view, saved searches with its own "Go to Discover" empty-state button, account deletion, and - new - editing name/phone and changing password, including that a saved name change reflects in the header's `UserMenu` immediately), `AdminPage` (users list/search/filter/pagination, user detail + status update, self-status-change restriction, read-only Reviews segment), `PropertyEditPage`/`PropertyCreatePage` (the shared `PropertyForm`'s load/save/validation flows, including coordinate preservation on edit), `PropertyImage` (the shared broken-image-fallback component - shows a local "Photo unavailable" placeholder on `onError`), and `UserMenu` (the compact mobile-header control that replaced a separate always-visible name pill + Sign-out button - open/close, click-outside, Escape, and calling `onSignOut`). `NotificationsPage` and `LandingPage` are the only pages still regex-only-tested (not flagged by the appraisal as needing this pass). `App.jsx`'s main nav also has a dedicated `app.render.test.jsx` covering its ARIA tablist pattern (roving tabindex, arrow-key navigation, tabpanel linkage).
- Responsive CSS guardrails (breakpoints, overflow protection).
- An opt-in **end-to-end auth flow** integration test (`frontend/tests/auth-flow.integration.test.js`) that hits a real running backend — register, login, fetch current user, save/remove favorites. Enabled with `RUN_AUTH_E2E=true`.

## Mobile tests

Jest + `jest-expo` + React Native Testing Library (36 suites, 206 tests), covering:

- API client logic (query string building, auth token/base URL storage, `apiFetch` success/error paths including `suggestions` passthrough).
- Formatting utilities (currency, rating summary, status labels).
- Pure-function modules: `screens/workspace/propertyForm.js`, `navigation/roleTabs.js`.
- `services/pushNotifications.js` directly (not mocked) — including a race-condition regression test proving `unregisterForPushNotifications` correctly waits for an in-flight `registerForPushNotifications` call rather than no-opping on a still-null token.
- Context providers: `ThemeContext`, `SettingsContext` (+ its standalone `resolveAssetUrl` helper), `AuthContext` (session restore on mount, login/register/logout, push-registration wiring) — each via a small test-consumer component.
- Every bottom-tab screen (RNTL render tests, with `api/index.js` and the relevant context hooks mocked): a shared component (`MessageView`), `DashboardScreen`, `DiscoverScreen` (including a stale-response race-condition regression test), `SavedScreen`, `WorkspaceScreen`, `MoversScreen` (directory and mover-dashboard views, plus a separate `MoversScreen.debounce.test.js` for the county-search debounce/race-condition guard), `RequestsScreen`, `NotificationsScreen` (including a reload-on-focus regression test), `FeedbackScreen` (submitter and admin-responder views), `AccountScreen`, `PropertyEditScreen`, `AdminScreen`.
- Discover's sub-screens (`PropertyDetailScreen` - sign-in/mover/not-your-listing gates, cost summary, save, retry, navigating to the inquiry/viewing forms; `InquiryFormScreen`; `ViewingRequestFormScreen` - open vs. scheduled viewings; `MoverRequestFormScreen` - with/without a resolved device location), the auth screens (`LoginScreen`, `RegisterScreen` - including the username-taken-suggestions flow), `LandingView`, and `AdminUserDetailScreen` (stat grid, self-status-change restriction, status update + history refresh).

Real quirks found writing these, under this React 19 + `jest-expo` + `@testing-library/react-native@14` combination:
- **`render()` and every `fireEvent.*()` call are `async`** in this RNTL major version and must be `await`ed - skipping this doesn't throw where you'd expect; it silently leaves state updates unflushed, so a synchronous assertion right after `fireEvent.press(...)` sees the pre-update tree, and two unawaited `fireEvent.press` calls back to back can corrupt the render tree (comes back empty) for that test or even a later, unrelated one. This is *why* every test in this suite chains `await` through `render`/`fireEvent`, and it's also the underlying explanation for a resolution the mobile test suite already relied on before this was root-caused - flushing after each `fireEvent` call rather than chaining them synchronously.
- `getByText` does **not** concatenate a `<Text>` element's multiple expression-children into one string for exact matching - a node rendering `by {name}{reason}` (three separate children) needs a regex like `getByText(/name/)`, not the literal full string, which would otherwise report "unable to find" despite the text visibly being in the rendered tree dump.
- `ViewingRequestFormScreen` unconditionally `require()`s the native `@react-native-community/datetimepicker` module whenever `Platform.OS !== "web"` - true under Jest, which reports `Platform.OS === "ios"` by default. Its test stubs the whole module out (`jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker")`) rather than fighting the real native module, since none of its scenarios need to actually open the native picker.
- A real (non-mocked) `setTimeout` debounce mixed with the rest of a test file's synchronous tests left a stray timer callback firing mid-render in a *later*, unrelated test. `MoversScreen.debounce.test.js` is kept in its own file specifically to isolate this, rather than reaching for fake timers (which fought `jest-expo`'s RN mocks more than it helped).

Every screen is now covered - see [Roadmap](Roadmap#completed) for when this closed out.

## Before opening a pull request

Run whichever package(s) you touched (or everything, if unsure) — see [Contributing](../CONTRIBUTING.md) for the full checklist and branch/PR conventions.
