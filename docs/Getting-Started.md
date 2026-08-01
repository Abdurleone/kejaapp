# Getting Started

This page mirrors the repository README's quick-start flow and adds a little more detail for local setup.

## Prerequisites

- Node.js and npm
- Docker and Docker Compose for the containerized stack
- A MongoDB instance: a local `mongod`, a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, or the repo's compose stack
- Optional Redis if you want the cache/rate-limit path enabled
- Optional S3-compatible object storage for uploaded property images
- Optional ClamAV for malware scanning

## Install

From the repo root:

```bash
git clone https://github.com/Abdurleone/kejaapp.git
cd kejaapp
npm --prefix backend install
npm --prefix frontend install
npm --prefix mobile install
```

## Configure the backend

The backend expects at minimum:

- `MONGODB_URI`
- `JWT_SECRET`

You can configure those from the backend environment file or from the environment directly. The repo's backend config loader is in [backend/config/env.js](https://github.com/Abdurleone/kejaapp/blob/main/backend/config/env.js).

For local development, the backend can start in a degraded state if MongoDB is not reachable yet, while database-backed routes remain unavailable until the connection is restored.

## Run the backend

From the repo root:

```bash
npm run dev
```

Or directly:

```bash
cd backend
npm install
npm run dev
```

The API is available at `http://localhost:5000`.

## Run the web frontend

```bash
npm run frontend
```

Starts the Vite dev server on `http://localhost:5173` (or the next open port, printed to the console, if that port is taken).

Build for production:

```bash
cd frontend && npm run build
```

## Run the mobile app

```bash
npm run mobile
```

Starts the Expo/Metro bundler. See **[Mobile App](Keja-App)** for how to open it in Expo Go, a simulator/emulator, or a browser preview, and how to point it at your backend from a physical device.

## Seed demo data

```bash
cd backend
npm run seed
```

This seeds 9 counties' worth of properties (Nairobi, Nakuru, Mombasa, Kisumu, Uasin Gishu, Kiambu, Nyeri, Machakos, Kakamega), matching movers (each with its own login account, affiliate relationships, and verification records in various states), reviews, inquiries, viewing requests, and agency verification records in various states.

For the seeded account list and the shared demo password, see **[Demo credentials](demo-credentials.md)**. The password value is kept in a separate document so the main setup guide remains concise.

## Run with Docker instead

```bash
cp .env.example .env   # set JWT_SECRET
docker compose up --build
```

Runs backend, frontend, MongoDB, Redis, and ClamAV together. Frontend is available at `http://localhost:8080`, and the backend at `http://localhost:5000`.

See **[Deployment](Deployment)** for container details, health checks, and the object-storage path.

## Next steps

- **[Testing](Testing)** — run the test suites and linters before you commit anything.
- **[API Reference](API-Reference)** — every backend endpoint.
- **[Troubleshooting](Troubleshooting)** — MongoDB connection errors, Expo/Android emulator setup.
