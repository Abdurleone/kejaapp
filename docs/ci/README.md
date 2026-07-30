# CI workflow added

This branch adds a simple GitHub Actions workflow to run lint and tests across the monorepo components.

Files added:
- .github/workflows/ci.yml

Notes:
- The workflow installs dependencies for backend, frontend, and mobile (if present), runs `npm run lint` and `npm test` using the root scripts defined in package.json.
- If you prefer finer-grained jobs or matrix builds per package, I can refactor the workflow into multiple jobs (backend/frontend/mobile) with parallel runs.
