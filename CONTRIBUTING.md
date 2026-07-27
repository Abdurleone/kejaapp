# Contributing to KejaApp

Thanks for your interest in contributing! This document covers everything
you need to get set up, make a change, and get it merged.

Please also read our [Code of Conduct](./CODE_OF_CONDUCT.md) — participation
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
npm install
cp backend/.env.example backend/.env
```

Fill in `backend/.env` with a MongoDB URI and a JWT secret (a local
`mongod`, a free MongoDB Atlas cluster, or `docker compose up mongodb` all
work). See the [README](./README.md#getting-started) for the full local
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
billing-notification precaution; see the [ISO 27001 SoA](docs/iso27001-statement-of-applicability.md)
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
  over abstraction, and reuses existing helpers (`app-utils.js` on web,
  `mobile/src/api/index.js` on mobile, controller/validator/route patterns
  on the backend) rather than duplicating logic.
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

## Reporting bugs and requesting features

Open a [GitHub issue](https://github.com/Abdurleone/kejaapp/issues) with as
much detail as you can: what you expected, what happened instead, and steps
to reproduce (for bugs), or the problem you're trying to solve (for feature
requests).

Found a security vulnerability? Please don't open a public issue — see
[SECURITY.md](./SECURITY.md) instead.

## License

By contributing, you agree that your contributions will be licensed under
this project's [MIT License](./LICENSE).
