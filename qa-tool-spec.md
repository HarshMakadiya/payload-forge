# QA / Load Testing Tool — Project Context & Specification

> **Purpose of this doc:** This is a context/spec file meant to be fed to an AI (or a dev) so it understands the full scope of a QA testing tool being built. It captures the two core features already decided, plus additional features, architecture, and data model recommendations to round it out into a real product.

---

## 1. Problem Statement

This is a **general-purpose QA/load-testing tool** — not scoped to any single codebase. It needs to work against any API the owner points it at: personal side projects, freelance/client work, and larger production systems alike. A "Project" in this tool is just a target configuration (base URLs, environments, endpoints) — the tool itself is standalone and reusable across however many projects get added to it over time.

Existing tools solve pieces of this but not the whole thing for a solo/small-team dev workflow:
- **Postman/Insomnia** — great for manual/collection-based testing, weak on sustained load generation and no AI payload variation.
- **k6/JMeter/Locust** — strong load generation, but config-as-code heavy, no built-in AI payload generation, and log/response inspection is not first-class.
- **Nothing mainstream combines**: rate-controlled load generation + full request/response logging + AI-generated realistic payload variation, in one dashboard.

This tool's differentiator is #2 (AI payload generation) combined with #1 (controlled-rate load testing with full observability).

---

## 2. Core Features (already decided)

### 2.1 Rate-Controlled Load / Burst Testing

Hit a target API at a configured rate over a configured duration, e.g.:
- "1000 requests in 1 minute"
- "10,000 requests in 1 hour"
- Custom: \`N requests\` per \`time window\`, repeatable/looped or one-shot

**Required behavior:**
- **Rate strategies**: constant rate (evenly spaced), burst (fire immediately then wait), ramp-up (gradually increase rate), ramp-down, spike (short burst then baseline).
- **Concurrency control**: max parallel in-flight requests, so the tool doesn't just queue infinitely if the target API is slow.
- **Per-request config**: method, URL (with path/query variables), headers, auth, body/payload, timeout, retry policy.
- **Live status counters** while a run is in progress:
  - Succeeded (2xx)
  - Failed (4xx/5xx, connection errors, DNS errors)
  - Timed out
  - Pending / in-flight
  - Cancelled (user aborted the run or individual requests)
  - Queued (not yet dispatched)
- **Run controls**: start, pause, resume, cancel entire run, cancel individual pending requests.
- **Full request/response log per call**:
  - Timestamp, request ID, sequence number
  - Full request: method, URL, headers, payload/body
  - Full response: status code, headers, body, latency (ms)
  - Error detail if failed (timeout, network error, non-2xx, etc.)
  - Retry count / retry history if retried
- **Log usability at scale**: with 1,000–10,000+ logs per run, you need search/filter (by status, status code, latency range, keyword in payload/response) and pagination — a flat unsearchable list won't be usable.

### 2.2 AI-Generated Realistic Payloads

For runs that need unique/varied payloads per call (not the same body repeated 1000 times):
- **Input**: a sample payload (JSON) or a schema (JSON Schema/OpenAPI), plus optional field-level rules (e.g., \`email must be valid format\`, \`age between 18–65\`, \`status enum: [active, inactive, pending]\`).
- **Generation**: use an LLM (Claude) to generate N realistic, production-like payload variations — not just randomized garbage, but data that resembles real-world values (realistic names, addresses, dates, IDs, edge cases).
- **Batch generation at scale**: generating 1,000–10,000 truly unique payloads one-by-one via LLM call is slow/expensive. Practical approach:
  - Generate a smaller "seed set" via LLM (e.g., 50–200 realistic variations covering different shapes/edge cases).
  - Programmatically expand/mutate the seed set (Faker-style field substitution: swap names, emails, IDs, dates) to reach the full volume needed, keeping it fast and cheap.
  - Optionally re-inject LLM generation periodically (e.g., every 100th payload) to keep diversity high.
- **Payload templates**: save a generated set as a reusable "payload template" tied to an endpoint, versioned, so you don't regenerate from scratch every run.
- **Edge case injection (optional toggle)**: let the AI intentionally include a % of malformed/boundary payloads (empty strings, nulls, max-length strings, negative numbers) to test API robustness, not just the happy path.
- **Cost/token visibility**: show estimated token usage/cost before generating a large batch.

---

## 3. Additional Recommended Features

### 3.1 Test Organization
- **Collections/Suites**: group related endpoints/tests together (like Postman collections), so a "run" can target a whole suite, not just one endpoint.
- **Environments**: dev/staging/prod configs with variables (base URL, API keys, tokens) swappable without editing the test itself.
- **Import**: import existing OpenAPI/Swagger spec or Postman collection to bootstrap test definitions instead of manual entry.

### 3.2 Auth & Security Handling
- Support common auth types out of the box: Bearer token, API key (header/query), Basic auth, OAuth2 client-credentials flow.
- Secrets/tokens stored encrypted, never shown in plaintext logs.
- Optional: basic security fuzzing (SQLi/XSS-style payload injection) as a stretch feature for robustness testing.

### 3.3 Assertions & Validation
- Per-endpoint assertions beyond just status code: response schema validation (JSON Schema), specific field value checks, response time threshold ("fail if p95 > 500ms").
- A run isn't just "did it respond" — it's "did it respond correctly."

### 3.4 Reporting & Analytics
- Post-run summary: total requests, success rate, error breakdown by status code, latency percentiles (p50/p90/p95/p99), throughput over time (requests/sec graph).
- Compare two runs (regression view) — e.g., "did this run get slower/more error-prone than last week's baseline?"
- Export report as PDF/CSV/JSON for sharing.

### 3.5 Scheduling & CI/CD Integration
- Trigger a run via webhook, cron schedule, or CI pipeline (GitHub Actions/Azure DevOps) so load tests can be part of a deployment pipeline, not just manual.
- Alerting: Slack/email/webhook notification if a scheduled run's error rate crosses a threshold.

### 3.6 Distributed Load Generation (scale consideration)
- For very high rates (10k+/hour is modest, but if this grows toward 10k/min or more), a single Node process may not sustain it — plan for a worker-pool architecture from day one so scaling later means adding workers, not rewriting.

### 3.7 Collaboration (if more than just personal use)
- Multi-user access, shared collections, run history per user/team, basic roles (viewer/editor).

### 3.8 Data-Driven Testing (complement to AI generation)
- Allow CSV/JSON file upload as an alternative payload source (for cases where you already have real anonymized production-like data and don't need AI generation).

---

## 4. Architecture Decision

**Stack: NestJS (api + worker) + Next.js/React + PostgreSQL + Redis/BullMQ.**

Reasoning: this is an I/O-bound problem (waiting on network responses from target APIs), not a CPU-bound one — the workload is dispatching and tracking HTTP calls, not crunching numbers. At the throughput levels described (1,000/min ≈ 17 req/sec, 10,000/hour ≈ 3 req/sec), Node's event loop handles this comfortably; a lower-level language (Go/Rust, which is what tools like k6 or Vegeta use) only starts to matter once you're pushing tens of thousands of requests **per second** sustained, which isn't the target use case here. Given that the performance ceiling of Node is a non-issue at this scale, the deciding factor is build speed and maintainability — and an \`api\` + \`worker\` + queue split is a pattern already proven out, so reusing it here means less new surface area to get wrong.

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Next.js/React dashboard | Live run view via WebSocket, config forms for test/run setup, log explorer with filters |
| **API service** | NestJS \`api\` app | Handles CRUD for projects, test configs, collections, environments, payload templates; kicks off runs |
| **Worker service** | NestJS \`worker\` app | Actual load generation — dispatches HTTP calls at controlled rate, writes results |
| **Queue** | BullMQ (Redis) | Distributes individual request jobs across workers so rate-control and concurrency limits are enforced centrally; horizontally scalable by adding more worker instances if a future project needs higher throughput |
| **Real-time updates** | WebSocket (Socket.io or native) | Push live succeeded/failed/pending counters to the dashboard during a run without polling |
| **Database** | PostgreSQL (Prisma) | Projects, environments, test configs, run metadata, aggregated stats |
| **High-volume logs** | Don't store every full request/response body in Postgres — store bodies in object storage (S3-compatible) keyed by request ID, keep only metadata (status, latency, timestamp, blob pointer) in Postgres for fast querying | Keeps the DB fast to query even with 10k+ logs per run, across many projects |
| **AI generation** | Anthropic Claude API (structured JSON output) | Reliable structured-output generation for realistic payloads from a schema/sample |
| **Deployment** | Any container host (Azure Container Apps, Render, Fly.io, etc.) for api+worker; Vercel for the dashboard | Not tied to one project's existing infra — pick whichever host makes sense per environment (personal vs client work) |

If a future project ever needs sustained throughput in the tens of thousands of requests per second, the queue-based design means the fix is "add more worker instances," not a rewrite — so there's no need to over-engineer for that case now.

---

## 5. Draft Data Model

- **Project** — top-level container representing one target codebase/API (e.g., a personal side project, a client's API, a production system) — the tool holds many of these, unrelated to each other
- **Environment** — base URL + variables + secrets, belongs to a Project
- **Endpoint/TestCase** — method, path, default headers, default payload/schema, assertions
- **Collection/Suite** — ordered group of Endpoints
- **PayloadTemplate** — a saved set of generated/uploaded payloads, versioned, linked to an Endpoint
- **TestRun** — one execution instance: target (Endpoint or Suite), rate config, start/end time, status (running/completed/cancelled), summary stats
- **RequestLog** — one row per individual call within a run: request ID, timestamp, payload ref, response, status, latency, retry count
- **User/Team** (if multi-user) — auth, roles, ownership of Projects

---

## 6. MVP Scope vs Later Phases

**MVP (v1):**
1. Single endpoint, rate-controlled run (constant rate + burst) with live counters
2. Full request/response log with basic filter (status, keyword)
3. AI payload generation from a sample payload (seed generation + programmatic expansion)
4. Basic auth support (Bearer/API key/header)
5. Post-run summary (success rate, latency percentiles)

**Phase 2:**
1. Collections/suites, environments, OpenAPI import
2. Assertions/schema validation
3. Run comparison/regression view
4. Scheduling + CI integration + alerting

**Phase 3 (stretch):**
1. Distributed multi-worker scaling for very high throughput
2. Multi-user/team collaboration
3. Security fuzzing mode

---

## 7. Open Questions to Resolve Before Building

- Is this strictly for REST/HTTP APIs, or should GraphQL/WebSocket/gRPC be considered later?
- Single-user tool for now, or multi-tenant from the start?
- Where will full response bodies be stored long-term — do old logs need to be purged/archived after N days?
- Expected max rate — is 10k/hour the ceiling, or should the architecture assume it'll need to go higher (10k/min+) later?
- Self-hosted only, or does this need to run as a hosted service others could use?

---

## 8. Implementation Requirements Added During Review

These requirements keep the MVP safe, reproducible, and operable without expanding its core feature set.

### 8.1 Target Authorization and Safety Guardrails

- A user must explicitly acknowledge that they own, or are authorized to test, the selected target before a run can start.
- Production environments must be clearly marked and require an additional confirmation; enforce configurable request-rate and concurrency caps for them.
- Block private, loopback, link-local, and cloud-metadata addresses by default to prevent server-side request forgery (SSRF). Allow exceptions only through an explicit, auditable allowlist.
- Redact configured secrets and sensitive header/query/body fields from the UI, exports, and persisted logs. The redact-field list must be configurable per project.

### 8.2 Reproducible Run Snapshots

- On start, persist an immutable snapshot of the endpoint configuration, resolved non-secret variables, rate/concurrency settings, retry policy, assertion version, and payload-template version.
- Record the worker version and a random seed for programmatic payload mutation. A completed run must remain explainable even after its endpoint or template is edited.

### 8.3 Clear Execution Semantics

- Define whether a configured total means attempted requests or completed requests; for v1, it means **attempted dispatches**, including attempts that time out or fail.
- Pausing stops new dispatches but allows in-flight requests to finish. Cancelling stops new dispatches and marks queued work cancelled; in-flight work should be aborted where the HTTP client supports it.
- Retries must be bounded, respect backoff and jitter, and count as separate attempts in logs while being associated with one logical request.
- Rate scheduling should measure and report actual dispatched throughput separately from the configured target rate, including queue delay caused by concurrency limits.

### 8.4 Data Retention, Privacy, and Access

- Establish a configurable retention period for request metadata and body blobs, including a scheduled deletion process and a manual project-level purge.
- Body capture must be configurable, with a metadata-only mode for sensitive or high-volume runs. Apply a maximum captured-body size and record when truncation occurs.
- Exported reports must apply the same redaction rules as the dashboard. Access to logs, exports, and secrets must be scoped to the project owner in the single-user MVP.

### 8.5 Reliability and Observability

- Make each queued dispatch idempotent using a run ID and sequence number so retries, worker restarts, or duplicate queue delivery do not silently over-send traffic.
- Track queue lag, worker health, Redis connectivity, log-write failures, and dropped real-time events. The final run summary must be computed from persisted records, not only WebSocket counters.
- Specify startup recovery: interrupted runs become `interrupted` and can be inspected; they must never automatically resume against a target without the user starting a new run.

### 8.6 MVP Acceptance Criteria

- A constant-rate run reaches the configured dispatch count without exceeding its configured concurrency cap.
- Pause, resume, and cancel produce consistent final counts where dispatched + queued + cancelled can be reconciled.
- A user can filter and page a 10,000-request run without loading all log bodies into the browser.
- All secrets and configured sensitive fields remain redacted in logs and exports.
- An AI-generated payload batch validates against the supplied JSON schema before it is eligible to run.
