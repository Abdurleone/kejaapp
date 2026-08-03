# KejaApp

KejaApp is a location-first rental platform for tenants, landlords, agencies, admins, and movers. It combines property discovery, verification workflows, transparent pricing, notifications, and move coordination in a single product.

## Current Status

KejaApp is currently in active MVP development. The repository includes:

- a Node.js/Express backend API
- a Vite + React web frontend
- an Expo React Native mobile app
- deployment and infrastructure assets for Docker, Render, and Kubernetes

## Overview

KejaApp is designed to support the full rental lifecycle:

- tenants can discover and save properties
- landlords and agencies can manage listings and owner workflows
- admins can moderate users and verification requests
- movers can register, get verified, and receive service requests

The goal is to make rental discovery more transparent, more trusted, and more operationally complete than a basic listing portal.

## Payment Boundary

KejaApp is a discovery and coordination platform. It does not process, hold, or mediate rent, deposits, agency fees, or mover charges. Those arrangements are agreed and settled directly between the parties involved.

## Key Features

A short summary of the most important product capabilities:

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
- [docs](docs) — product, operational, and compliance documents
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

The workspace root includes a small set of convenience scripts for common development tasks:

```bash
npm run dev
npm run frontend
npm run mobile
npm run seed
npm run start
npm test
npm run test:backend
npm run test:frontend
npm run test:mobile
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

- [CHANGELOG.md](CHANGELOG.md) — detailed, chronological history of what's been built.
- [AUTHENTICATION_GUIDE.md](AUTHENTICATION_GUIDE.md)
- [docs/devops.md](docs/devops.md)
- [docs/scaling-load-balancing.md](docs/scaling-load-balancing.md)
- [docs/qa-qc-report.md](docs/qa-qc-report.md)
- [docs/demo-credentials.md](docs/demo-credentials.md)
- [mobile/README.md](mobile/README.md)

## Deployment

The repository supports multiple deployment paths:

- Docker and Docker Compose for local and staging-style runs
- Render Blueprint via [render.yaml](render.yaml)
- Kubernetes manifests in [k8s](k8s)

For more detail, see [docs/devops.md](docs/devops.md).

## Contributing

Contributions are welcome. For a clean development loop:

1. create a feature branch
2. run the relevant tests and lint checks
3. keep documentation in sync with behavior changes
4. open a pull request with a clear summary of the work

## License

This project is licensed under the terms in [LICENSE](LICENSE).
