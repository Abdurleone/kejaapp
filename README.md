# KejaApp

KejaApp is a location-first rental platform for tenants, landlords, agencies, admins, and movers. It combines property discovery, verification workflows, transparent pricing, notifications, and move coordination in a single product.

## Current Status

KejaApp is live in production and under active development — see [docs/project/live.md](docs/project/live.md) for exactly what's deployed right now and what's still pending. Development happens on a single rolling `main` branch (see [docs/SECURITY.md](docs/SECURITY.md)); [v1.0.0](https://github.com/Abdurleone/kejaapp/releases/tag/v1.0.0) is a tagged snapshot of that history, not a release-branch model. The repository includes:

- a Node.js/Express backend API
- a Vite + React web frontend
- an Expo React Native mobile app
- deployment and infrastructure assets for Docker, Render (the live production deployment), and Kubernetes (a reference/alternative path)

## Overview

KejaApp is designed to support the full rental lifecycle:

- tenants can discover and save properties
- landlords and agencies can manage listings and owner workflows
- admins can moderate users and verification requests
- movers can register, get verified, and receive service requests

The goal is to make rental discovery more transparent, more trusted, and more operationally complete than a basic listing portal.

## Payment Boundary

KejaApp is a discovery and coordination platform. It does not process, hold, or mediate rent, deposits, agency fees, or mover charges. Those arrangements are agreed and settled directly between the parties involved. This is a **permanent** product boundary, not a placeholder pending a future payments feature.

The one M-Pesa integration that exists ([Support KejaApp](docs/dev/Payments.md)) doesn't cross this line: it's a voluntary service charge a user can optionally pay directly to the app's developer, unrelated to any tenant/landlord/agency/mover transaction — kejaapp never holds, routes, or takes a cut of money between users.

## Key Features

A short summary of the most important product capabilities:

- email/password authentication, plus Google Sign-In on web (mobile pending Google Cloud Console setup — see [Authentication](docs/dev/Authentication.md))
- map-based and location-first property discovery
- saved properties and saved searches
- landlord/agency property management
- inquiries, viewing requests, and review flows
- agency and mover verification workflows
- real notifications and reminder sweeps
- mover discovery and service request management
- admin moderation and account-status controls
- feedback and public testimonials

## Project Structure

The repository is organized into a few major areas:

- [backend](backend) — Express API, routes, models, services, jobs, and tests
- [frontend](frontend) — Vite SPA for the web experience
- [mobile](mobile) — Expo-based mobile application
- [docs](docs) — `compliance/` (legal/privacy/security), `dev/` (engineering reference), `project/` (status/roadmap), `user-manual/` (per-role guides)
- [k8s](k8s) — Kubernetes deployment manifests

## Quick Start

To get the project running locally, make sure you have:

- Node.js and npm
- Docker and Docker Compose
- access to MongoDB
- Redis if you want the cache/rate-limit path enabled
- optional S3-compatible object storage for uploaded property images
- optional ClamAV for malware scanning

### Required Environment Variables

The backend expects at least the following environment values:

- `MONGODB_URI`
- `JWT_SECRET`

Other commonly used optional settings include:

- `REDIS_URL`
- `CLAMAV_HOST`
- `STORAGE_DRIVER`
- `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`
- `GOOGLE_CLIENT_ID` — enables Google Sign-In; unset means `POST /api/auth/google` 503s instead of failing silently
- `SENTRY_DSN` (backend), `EXPO_PUBLIC_SENTRY_DSN` (mobile) — error tracking, unset by default
- `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` — a separate, private bucket for `npm run backup`/`npm run restore` (see [docs/dev/devops.md](docs/dev/devops.md))

The backend loads and validates configuration from [backend/config/env.js](backend/config/env.js).

## Running the App Locally

### Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix mobile install
```

### Start the backend

```bash
npm --prefix backend run dev
```

### Start the frontend

```bash
npm --prefix frontend run dev
```

### Start the mobile app

```bash
npm --prefix mobile run start
```

### Seed demo data

```bash
npm --prefix backend run seed
```

## Development Workflow

The root `package.json` wraps the per-package commands above as convenience scripts — `npm run dev` and `npm --prefix backend run dev` do the same thing:

```bash
npm run dev        # = npm --prefix backend run dev
npm run frontend    # = npm --prefix frontend run dev
npm run mobile      # = npm --prefix mobile run start
npm run seed        # = npm --prefix backend run seed
npm run start       # backend, production mode (no nodemon)
```

Linting (see [Testing](#testing) below for the equivalent test commands, which aren't repeated here):

```bash
npm run lint
npm run lint:backend
npm run lint:frontend
npm run lint:mobile
```

### Backend

The backend uses:

- Node.js
- Express
- MongoDB via Mongoose
- Redis-backed rate limiting and caching when configured
- scheduled jobs for notification nudges and reminders

### Frontend

The web app is a React single-page application with manual routing and real backend integration.

### Mobile

The mobile app is built with Expo and React Native, sharing the same product concepts as the web app.

## Testing

### Backend tests

Run:

```bash
npm run test:backend
```

The backend test suite covers route behavior, middleware, models, services, validation, and admin workflows.

### Frontend tests

Run:

```bash
npm run test:frontend
```

### Mobile tests

Run:

```bash
npm run test:mobile
```

### Full test suite

```bash
npm test
```

## Documentation

This README is a quick-start landing page, not the full reference. For everything else — API reference, per-role user stories, architecture, roadmap, governance/policy docs, and the user manual — see the [project Wiki](https://github.com/Abdurleone/kejaapp/wiki).

Other documents kept in this repository:

- [docs/project/CHANGELOG.md](docs/project/CHANGELOG.md) — detailed, chronological history of what's been built.
- [docs/project/live.md](docs/project/live.md) — what's actually deployed and working right now, and what's still pending.
- [docs/SECURITY.md](docs/SECURITY.md) — how to report a vulnerability privately.
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — setup, code style, and the PR process (see [Contributing](#contributing) below for the access policy).
- [docs/dev/AUTHENTICATION_GUIDE.md](docs/dev/AUTHENTICATION_GUIDE.md)
- [docs/dev/devops.md](docs/dev/devops.md)
- [docs/dev/scaling-load-balancing.md](docs/dev/scaling-load-balancing.md)
- [docs/project/qa-qc-report.md](docs/project/qa-qc-report.md)
- [docs/project/demo-credentials.md](docs/project/demo-credentials.md)
- [mobile/README.md](mobile/README.md)

## Deployment

The repository supports multiple deployment paths:

- Docker and Docker Compose for local and staging-style runs
- **Render Blueprint via [render.yaml](render.yaml) — the actual live production deployment** (`kejaapp-backend-7iu3.onrender.com` — one URL for both the web app and its API)
- Kubernetes manifests in [k8s](k8s) — a reference/alternative path, exercised by CI's `k8s-smoke-test` job but not currently deployed anywhere

For more detail, see [docs/dev/devops.md](docs/dev/devops.md).

## Contributing

This is a closed, all-rights-reserved project (see [License](#license)) — the
source is publicly viewable but not open for unsolicited forks or pull
requests. If you'd like to contribute, contact the copyright holder first to
get express permission before doing any work. Once permission is granted, see
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for setup, code style, and the PR
process.

## License

This project is licensed under the terms in [LICENSE](LICENSE).
