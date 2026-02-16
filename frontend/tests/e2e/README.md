# E2E Smoke Tests

These tests cover Phase 2 authenticated UI access in two ways:

- `real-login.spec.js`: exercises the real login UI flow.
- `smoke-bootstrap.spec.js`: uses a test-only backend helper to bootstrap auth for faster protected-route smoke checks.

## Required backend test flags

Run backend with:

- `NODE_ENV=test`
- `ENABLE_E2E_AUTH_HELPER=true`

Optional credential overrides:

- `E2E_TEST_EMAIL`
- `E2E_TEST_USERNAME`
- `E2E_TEST_PASSWORD`

## Run

From `frontend/`:

1. Install Playwright dependency and browser:
   - `npm install`
   - `npx playwright install`
2. Run smoke suite:
   - `npm run test:e2e:smoke`

Optional URLs:

- `FRONTEND_BASE_URL` (default `http://127.0.0.1:5173`)
- `BACKEND_BASE_URL` (default `http://127.0.0.1:5000`)
