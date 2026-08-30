# Implementation Task Plan

## Phase 0 — Foundation

- [ ] Confirm the open questions in `qa-tool-spec.md` and record outcomes in `DECISIONS.md`.
- [ ] Define project conventions in `CONVENTIONS.md`.
- [ ] Bootstrap the Next.js, NestJS API, NestJS worker, PostgreSQL, and Redis/BullMQ workspace.
- [ ] Establish environment configuration, migrations, local development, linting, tests, and CI.

## Phase 1 — MVP Domain and API

- [ ] Implement project, environment, endpoint, payload-template, test-run, and request-log data models.
- [ ] Implement encrypted secret storage and redaction configuration.
- [ ] Build CRUD APIs for projects, environments, and endpoints.
- [ ] Implement endpoint configuration validation and production/target safety guardrails.

## Phase 2 — Load Execution

- [ ] Implement rate scheduler, concurrency limiter, and constant-rate strategy.
- [ ] Implement burst strategy, run lifecycle controls, retries, cancellation, and recovery handling.
- [ ] Persist run snapshots, per-request metadata, and response-body blobs.
- [ ] Publish real-time counters and calculate final run statistics.

## Phase 3 — Dashboard and Logs

- [ ] Build project, endpoint, and run-configuration screens.
- [ ] Build the live run view with controls and status counters.
- [ ] Build searchable, paginated request-log explorer with safe body viewing.
- [ ] Build post-run report with error breakdown, throughput, and latency percentiles.

## Phase 4 — AI Payloads and Verification

- [ ] Implement sample/schema input and schema validation.
- [ ] Implement Claude seed generation, cost estimate, and safe programmatic expansion.
- [ ] Implement versioned payload templates and optional edge-case injection.
- [ ] Add unit, integration, and end-to-end coverage for the MVP acceptance criteria.

## Phase 5 — Release Readiness

- [ ] Define retention/purge policy and implement scheduled cleanup.
- [ ] Add application, worker, queue, and log-write observability.
- [ ] Document local setup and deployment.
- [ ] Perform an authorized staging load-test and publish the MVP release checklist.
