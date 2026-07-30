# Developer setup & quickstart

This page describes how to run KejaApp locally for development. Follow the copy/paste commands to bring up the backend API and frontend and run a couple of smoke tests.

Prerequisites
- Node.js 18 (LTS) — use nvm to install if needed
- npm (bundled with Node) or yarn
- Docker & Docker Compose (for database and optional services)

Important ports (defaults used in examples)
- Backend API: http://localhost:5000
- Frontend: http://localhost:3000
- Postgres (docker): 5432

Quickstart (copy & paste)

```bash
# clone
git clone https://github.com/Abdurleone/kejaapp.git
cd kejaapp

# copy example env and install root deps
cp .env.example .env
npm ci

# start Postgres via Docker Compose (optional; backend may have other ways to run DB)
docker compose up -d db

# run backend
cd backend
npm ci
npm run dev
# in this setup example API will be at http://localhost:5000

# open a new terminal to run frontend
cd ../frontend
npm ci
npm run start
# frontend at http://localhost:3000
```

Smoke tests

1) Login (example):

```bash
# Wait until backend is running, then run:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password"}'
```

Expect a JSON response containing a token (or an error if the account/password doesn’t exist). If no seed account exists, see the backend README for seeding instructions.

2) Get properties (requires token):

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/properties
```

Replace `<TOKEN>` with the token returned from login.

Notes & tips
- If you prefer Docker for full local stacks, the repo contains `docker-compose.yml`. Check `backend/` for DB migrations or seed commands.
- If a sample dev account is not available, create one using the admin interface or seed script (see backend/README).

