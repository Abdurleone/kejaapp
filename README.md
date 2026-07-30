# KejaApp

KejaApp is a tenant-first rental platform for tenants, landlords, agents, movers and admins. This repository contains the backend API, frontend, mobile client, deployment manifests, and documentation.

[Repository](/) • [Docs](./docs/README.md) • [Contributing](./CONTRIBUTING.md) • [Code of Conduct](./CODE_OF_CONDUCT.md) • [Security](./SECURITY.md)


---

## Quickstart (developer)

These steps get a local development environment running so you can explore the app and run tests.

Prerequisites
- Node.js >= 18 (or the LTS version you use)
- npm (or yarn)
- Docker & Docker Compose (for a local DB if desired)

Quick steps (copy & paste)

```bash
# clone
git clone https://github.com/Abdurleone/kejaapp.git
cd kejaapp

# create env from example and install
cp .env.example .env
npm ci

# run backend (example)
cd backend
npm ci
npm run dev
# API usually available at http://localhost:5000

# run frontend (example in new terminal)
cd ../frontend
npm ci
npm run start
# Frontend usually at http://localhost:3000
```

Notes
- See `docs/developer-setup.md` (coming) for explicit versions, DB setup, and smoke tests.
- If you prefer Docker Compose, `docker-compose.yml` is present at the repo root and starts services used by the app.


## What changed in this repo (short)
- This repo contains extensive policy and compliance documentation under `docs/` (DPIA, ISO27001, data protection, incident response) — those long documents have been moved out of README and are available from the docs index.
- Developer quickstarts, API examples, and CI configs live under `docs/` and `.github/workflows`.


## Where to find things (short)
- Code: `backend/`, `frontend/`, `mobile/`
- Deployment: `k8s/`, `docker-compose.yml`, `render.yaml`
- Docs & policies: `docs/` (see docs index)
- API collection: `docs/kejaapp-insomnia.json`


## Contributing & Security
- Please read `CONTRIBUTING.md` and `SECURITY.md` before contributing or reporting security issues.
- If you find secrets accidentally committed, do not post them in public issues — follow the guidance in `SECURITY.md`.


---

If you want, I can now:
- add a developer quickstart page with explicit install versions and smoke tests (recommended),
- add API curl examples and a minimal OpenAPI skeleton, and
- add a CI workflow that runs linters/tests and a badge.

