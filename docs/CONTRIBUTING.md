# Contributing to KejaApp

This is a closed, all-rights-reserved project (see [LICENSE](./LICENSE)) —
the source is publicly viewable but not open for unsolicited forks or pull
requests. **Contact the copyright holder and get express written permission
before doing any work.** Once permission is granted, this document covers
everything you need to get set up, make a change, and get it merged.

Please also read our [Code of Conduct](CODE_OF_CONDUCT.md) — participation
in this project means agreeing to abide by it.

## Project layout

This is a monorepo with three independent Node packages:

```text
backend/    Node/Express/MongoDB REST API
frontend/   React + Vite single-page web app
mobile/     React Native (Expo) app for iOS/Android
```

Each has its own `package.json`, ESLint flat config, and test suite. Root
`package.json` scripts fan out to all three (see below).

## Getting set up

```bash
git clone https://github.com/Abdurleone/kejaapp.git
cd kejaapp
npm --prefix backend install
npm --prefix frontend install
npm --prefix mobile install
cp backend/.env.example backend/.env
```

The root `package.json` has no `workspaces` field, so a plain `npm install` at the repo root only installs the root package itself (no real dependencies) — it does **not** install `backend/`, `frontend/`, or `mobile/`'s dependencies, even though the `npm run dev`/`frontend`/`mobile` scripts below do fan out into each package correctly.

Fill in `backend/.env` with a MongoDB URI and a JWT secret (a local
`mongod`, a free MongoDB Atlas cluster, or `docker compose up mongodb` all
work). See the [README](../README.md#getting-started) for the full local
setup, Docker instructions, and MongoDB troubleshooting tips.

Run everything:

```bash
npm run dev        # backend, from the repo root
npm run frontend    # web app
npm run mobile      # Expo/Metro bundler
```

## Before you open a pull request

Run the full test suite and linters for whichever package(s) you touched
(or everything, if you're not sure):

```bash
npm test            # all three packages
npm run lint         # all three packages

# or scoped to one package:
npm run test:backend  &&  npm run lint:backend
npm run test:frontend &&  npm run lint:frontend
npm run test:mobile   &&  npm run lint:mobile
```

If you changed backend code, also run the real-MongoDB integration tests
before submitting (CI runs these too, against a disposable database):

```bash
TEST_MONGODB_URI="mongodb://127.0.0.1:27017" TEST_MONGODB_DB_NAME=kejaapp_test npm run test:backend
```

CI (`.github/workflows/ci.yml`) is defined to run lint + tests for all three
packages plus a frontend production build on every push and pull request —
but as of this writing the workflow itself has been manually disabled (a
billing-notification precaution; see the [ISO 27001 SoA](compliance/iso27001-statement-of-applicability.md)
for the full story), so it currently doesn't run at all. Run the commands
above yourself before opening a PR; nothing automated will catch a red suite
right now.

## Branching and commits

- `main` is protected: all changes land through a pull request, no direct
  pushes.
- Give your branch a short, descriptive name (e.g.
  `fix-discover-radius-alignment`, `add-mover-reviews`).
- Write commit messages and PR titles as a short, imperative summary of the
  change (e.g. "Fix Discover radius filter alignment on narrow screens"),
  matching the existing [commit history](https://github.com/Abdurleone/kejaapp/commits/main).
- PRs are squash-merged, so intermediate "fix typo"/"address review
  comments" commits within your branch are fine — they'll collapse into one
  commit on `main`. Focus on a clear final PR title and description instead
  of a pristine commit-by-commit history.

## Code style

- Each package has its own ESLint flat config (`eslint.config.js`) — run
  `npm run lint` before pushing.
- Match the existing patterns in the file/area you're editing rather than
  introducing a new one — this codebase favors small, explicit functions
  over abstraction, and reuses existing helpers (`frontend/app-utils/` on
  web, `mobile/src/api/index.js` on mobile, controller/validator/route
  patterns on the backend) rather than duplicating logic.
- No enforced comment style, but prefer comments that explain *why*
  something non-obvious was done over comments that restate *what* the
  code does.

## Tests

Every package uses a real test runner, not a homemade harness:

- **backend**: Node's built-in `node:test` runner. Most tests mock Mongoose
  model methods directly (see `backend/tests/helpers/nodeTestCompat.js` for
  the `mock`/`describe`/`it` helpers used throughout); a smaller set of
  integration tests hit a real MongoDB instance and are opt-in via
  `TEST_MONGODB_URI` (skipped otherwise).
- **frontend**: two runners in one `npm test` — `node:test` for pure-function/
  API-helper coverage, then Vitest + jsdom + React Testing Library for real
  render/interaction tests of every page component (`frontend/tests/*.render.test.jsx`).
  `frontend/tests/page-components.test.js` is a legacy `node:test` regex-source-matching
  suite that predates the Vitest migration — most of what it covered has since
  moved to dedicated `.render.test.jsx` files, but it hasn't been fully retired.
- **mobile**: Jest + `jest-expo` + React Native Testing Library.

New features and bug fixes should come with test coverage in the same style
as the surrounding code. If you're fixing a bug, a regression test that
fails before your fix and passes after it is the most useful thing you can
add.

### Test data policy

Tests, fixtures, and the demo seeder (`backend/seeders/seedDemoData.js`) must
use synthetic data only - invented names, `@example.com` emails, placeholder
phone numbers - never real user data, even anonymized or sampled from a real
account. This has been the convention throughout the project; this section
just makes it an explicit, written policy rather than an unstated one.

If you're testing manually against a shared dev database, clean up
throwaway accounts afterward rather than leaving them - `npm run
cleanup-test-data` (dry run by default, `--confirm` to execute) removes
anything that isn't one of `seedDemoData.js`'s known accounts. 57 ad-hoc
QA/test accounts accumulated this way across sessions before this existed.

## Reporting bugs and requesting features

Open a [GitHub issue](https://github.com/Abdurleone/kejaapp/issues) with as
much detail as you can: what you expected, what happened instead, and steps
to reproduce (for bugs), or the problem you're trying to solve (for feature
requests).

Found a security vulnerability? Please don't open a public issue — see
[SECURITY.md](SECURITY.md) instead.

## License

By contributing (with express permission as described above), you agree that
your contributions become part of the Software under this project's
[all-rights-reserved license](./LICENSE).
