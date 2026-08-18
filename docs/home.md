# JakezApp Wiki

JakezApp is a location-first rental platform for tenants, landlords, agencies, admins, and mover providers. It combines property discovery, trusted verification, transparent pricing, notifications, and relocation workflows in one product.

This wiki is a navigable companion to the repository documentation. The [README](../README.md) is now the primary landing page for the project and is organized around quick start, project structure, development workflow, and documentation links. The wiki expands those areas into deeper reference material.

## Pages

- **[Getting Started](Getting-Started)** — prerequisites, install steps, local run commands, demo data, and Docker options.
- **[Architecture](Architecture)** — project structure, backend implementation, frontend implementation.
- **[Mobile App](Jakez-App)** — Expo setup, running on device/emulator, EAS builds, troubleshooting.
- **[Features and User Stories](Features-and-User-Stories)** — what the app does, written as acceptance criteria per role.
- **[API Reference](API-Reference)** — every backend route, grouped by resource.
- **[Authentication](Authentication)** — JWT/refresh-token flow, email-or-username login, registration.
- **[Testing](Testing)** — how to run backend/frontend/mobile tests and linters.
- **[Deployment](Deployment)** — Docker Compose, Render, and Kubernetes deployment paths.
- **[Contributing](CONTRIBUTING.md)** — how to propose a change, code style, PR process.
- **[Troubleshooting](Troubleshooting)** — common MongoDB/Expo setup issues.
- **[Governance and Policies](Governance-and-Policies)** — Code of Ethics, Terms of Service, Data Protection Policy, ISO 27001 self-assessment, and the rest of the `docs/` policy set.
- **[User Manual](user-manual/general-manual.md)** — a general guide plus a manual per role: [tenant](user-manual/tenant-manual.md), [landlord & agency](user-manual/landlord-agency-manual.md), [mover](user-manual/mover-manual.md), [admin](user-manual/admin-manual.md).
- **[Roadmap](Roadmap)** — what's shipped, what's next.

## Quick facts

| | |
|---|---|
| Backend | Node.js, Express, MongoDB (Mongoose) |
| Web frontend | React 19 + Vite, manual routing (no react-router) |
| Mobile | React Native (Expo), iOS + Android from one codebase |
| Auth | JWT + HTTP-only refresh-token cookies, login by email or username |
| Tests | Node's built-in `node:test` (backend, frontend), Jest + RNTL (mobile) |
| License | All rights reserved (source-available, [see LICENSE](../LICENSE)) |

## Repo layout at a glance

```text
backend/    Node/Express/MongoDB REST API
frontend/   React + Vite single-page web app
mobile/     React Native (Expo) app for iOS/Android
docs/       Governance/policy docs, user manual, DevOps and scaling notes
k8s/        Kubernetes manifests (alternative deploy path to Render)
```

See [Architecture](Architecture) for the full breakdown of each package.
