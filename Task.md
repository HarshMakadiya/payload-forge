# Implementation Task Plan

## Phase 0 — Foundation

- [x] Confirm the open questions in `qa-tool-spec.md` and record outcomes in `DECISIONS.md`.
- [x] Define project conventions in `CONVENTIONS.md`.
- [x] Bootstrap the Next.js, NestJS API, NestJS worker, PostgreSQL, and Redis/BullMQ workspace.
- [x] Complete a Docker Compose runtime smoke test for the API, worker, web app, PostgreSQL, Redis, and MinIO.
- [x] Establish Docker Compose environment configuration and schema synchronization.
- [x] Verify local development, linting, unit/integration tests, and production build.
- [x] Add CI for linting, type checks, unit/integration tests, and production builds.

## Phase 1 — MVP Domain and API

- [x] Implement project, environment, endpoint, payload-template, test-run, and request-log data models.
- [x] Implement encrypted secret storage and redaction configuration.
- [x] Build CRUD APIs for projects, environments, and endpoints.
- [x] Add dashboard edit and delete controls for projects, environments, and endpoints.
- [x] Add OpenAPI 3.x paste/upload preview and bulk Endpoint import.
- [x] Implement endpoint configuration validation and production/target safety guardrails.

## Phase 2 — Load Execution

- [x] Implement rate scheduler, concurrency limiter, and constant-rate strategy.
- [x] Implement burst strategy, run lifecycle controls, retries, cancellation, and recovery handling.
- [x] Persist run snapshots, per-request metadata, and response-body blobs.
- [x] Publish real-time counters and calculate final run statistics.

## Phase 3 — Dashboard and Logs

- [x] Build project, endpoint, and run-configuration screens.
- [x] Add a run preflight that reviews impact, safety checks, and acknowledgements before traffic starts.
- [x] Build the live run view with controls and status counters.
- [x] Build searchable, paginated request-log explorer with safe body viewing.
- [x] Build post-run report with error breakdown, throughput, and latency percentiles.

## Phase 4 — AI Payloads and Verification

- [x] Implement sample/schema input and schema validation.
- [x] Implement Claude seed generation, cost estimate, and safe programmatic expansion.
- [x] Implement versioned payload templates and optional edge-case injection.
- [x] Add unit/integration coverage for payload generation, input validation, and Test Run authorization.
- [ ] Add end-to-end coverage for MVP acceptance criteria if it becomes necessary; it is out of scope for now.

## Phase 5 — Release Readiness

- [x] Define retention/purge policy and implement scheduled cleanup.
- [x] Add application, worker, queue, and log-write observability.
- [x] Document local setup and deployment.
- [x] Publish the MVP release checklist.
- [ ] Perform an authorized staging load-test.
