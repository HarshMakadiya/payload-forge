# MVP Release Checklist

Use this checklist before making a Payload Forge deployment available. It does
not authorize traffic to any target; the operator must separately confirm that
each target is owned or authorized for testing.

## 1. Build and services

- [ ] Install the locked dependencies with `npm ci`.
- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test` successfully.
- [ ] Run `npm run build` successfully.
- [ ] Start the stack with `docker compose up -d --build`.
- [ ] Confirm the API health endpoint reports healthy: `GET /v1/health`.
- [ ] Confirm the dashboard is reachable on its configured `WEB_PORT`.
- [ ] Confirm PostgreSQL, Redis, MinIO, API, worker, and web services are
  healthy in `docker compose ps`.

## 2. Deployment configuration

- [ ] Create a fresh deployment `.env` from `.env.example`; do not reuse a
  development secret file.
- [ ] Set a unique `SECRETS_ENCRYPTION_KEY` and keep it outside source control.
- [ ] Set `WEB_PORT` and `WEB_ORIGIN` together. For example, port `3001`
  requires origin `http://localhost:3001`.
- [ ] Configure database, Redis, and S3-compatible object-storage credentials.
- [ ] Configure `TARGET_HOST_ALLOWLIST` only for private hosts the operator is
  authorized to test.
- [ ] Verify production rate and concurrency caps are stricter than the
  non-production defaults.

## 3. Safety and data handling

- [ ] Confirm payload sources are synthetic or anonymized; do not upload real
  sensitive production data.
- [ ] Confirm the target, Endpoint, rate, duration, concurrency, and payload
  source in the run review screen.
- [ ] Confirm the ownership/authorization acknowledgement for every Test Run.
- [ ] For a production Environment, confirm the second production
  acknowledgement and the lower configured limits.
- [ ] Confirm request metadata retention is 30 days and body-blob retention is
  7 days; verify body capture/truncation is appropriate for the target.

## 4. Authorized staging smoke run

- [ ] Record the staging target owner, authorization, and change window.
- [ ] Create or select the correct Project, staging Environment, and Endpoint.
- [ ] Start with a bounded Test Run: at least one minute, low concurrency, and
  a request count the staging owner has approved.
- [ ] Review the final rate estimate and safety checks before selecting
  **Start Test Run**.
- [ ] Watch the live counters and request log for unexpected errors; pause or
  cancel the Test Run if the staging owner requests it or error behavior is
  unsafe.
- [ ] Verify the final summary, Request Attempt logs, redaction, and response
  body capture behavior.

## 5. Release record

- [ ] Record the release commit or image digest, deployment date, operator,
  environment, and the staging authorization reference.
- [ ] Record the smoke-run configuration and outcome without storing secrets
  or sensitive request/response bodies.
- [ ] Log unresolved issues in GitHub Issues before declaring the MVP released.
