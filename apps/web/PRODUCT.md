# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a solo developer or QA engineer configuring and monitoring authorized REST/HTTP API load tests. They work mainly against development and staging targets, with guarded access to production testing when explicitly authorized.

## Product Purpose

Payload Forge makes it practical to configure, run, and investigate controlled API load tests from one self-hosted dashboard. Success means the operator can generate realistic synthetic traffic, understand every Request Attempt, and judge API behavior without assembling separate load-generation, payload-generation, and log-inspection tools.

## Positioning

Payload Forge combines controlled-rate load generation, searchable per-attempt observability, and realistic AI-assisted synthetic payload generation in one owner-operated dashboard.

## Operating Context

The operator organizes unrelated target APIs as Projects, defines their Environments and Endpoints, creates reusable payload templates, launches Test Runs, monitors live status, and inspects persisted Request Attempt logs and summaries. The initial deployment runs locally through Docker Compose and may test development, staging, or explicitly authorized production environments.

## Capabilities and Constraints

- The v1 product is owner-only, single-user, self-hosted, and limited to REST/HTTP APIs.
- A Test Run supports constant-rate or burst execution, bounded concurrency, pause, resume, cancel, live counters, persisted logs, and final latency and throughput statistics.
- AI-assisted generation uses Claude for realistic seed payloads and programmatic expansion for scale. Generated batches must validate against any supplied JSON Schema before use.
- Inputs must be synthetic or anonymized. Real sensitive production data is not accepted as a payload source.
- Runs require an ownership or authorization acknowledgement. Production targets require an additional confirmation and stricter configurable limits.
- v1 permits at most 1,000,000 requested dispatches, 10,000 dispatches per minute, a minimum one-minute duration, and bounded concurrency.
- Request metadata is retained for 30 days and request/response body blobs for 7 days. Body capture can be disabled or truncated.
- Private, loopback, link-local, and cloud-metadata targets are blocked by default unless deliberately allowlisted.
- Product terminology follows the repository domain model: Endpoint, Test Run, Logical Request, and Request Attempt.

## Brand Commitments

- The product name is **Payload Forge**.
- The voice is direct, precise, safety-conscious, and operational. It should make load state and consequences understandable without sounding alarmist.

## Evidence on Hand

- A working MVP dashboard and supporting API/worker implementation exist in this repository.
- The project specification, accepted decisions, domain terminology, and automated test suite are available in the repository.
- No customer logos, testimonials, external benchmarks, or production success claims are available. Future work must not fabricate them.

## Product Principles

1. Make traffic intentional: the operator should always understand what will run, where it will run, and under which limits.
2. Preserve investigative signal: live state, persisted attempts, and final summaries must remain clear at high request volumes.
3. Prefer realistic, safe test data: generate useful variation without exposing or encouraging sensitive production data.
4. Keep powerful workflows approachable: common load-testing tasks should not require config-as-code or several disconnected tools.
5. Make safety visible: authorization, production targeting, redaction, retention, and rate limits are product behavior rather than hidden policy.

## Accessibility & Inclusion

The dashboard must support keyboard operation, visible focus, clear labels and status language, sufficient contrast, and readable high-volume data. Meaning must not depend on color alone.
