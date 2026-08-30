# Architecture and Product Decisions

Record decisions here when they are made. Keep superseded decisions for history and link to the task, issue, or discussion that changed them.

| Date | Status | Decision | Rationale | Consequences |
|---|---|---|---|---|
| 2026-08-30 | Accepted | Build the MVP with Next.js/React, NestJS API and worker services, PostgreSQL/Prisma, Redis/BullMQ, and S3-compatible object storage for large bodies. | Fits the I/O-bound workload and supports a familiar, maintainable API/worker split. | Requires Redis and object storage in local/deployed environments. |
| 2026-08-30 | Accepted | The initial product is a general-purpose, reusable REST/HTTP API QA/load-testing tool. | Supports unrelated personal, freelance, and production projects under one tool while keeping the request and response model focused. | GraphQL, WebSocket, and gRPC are explicitly out of scope for v1. |
| 2026-08-30 | Accepted | Use Claude structured JSON output for realistic payload seeds, then programmatically expand them. | Balances realism, scale, and generation cost. | Payloads must be validated against their schema before execution. |
| 2026-08-30 | Accepted | Treat configured request totals as logical requests; retries are separately logged request attempts and consume the same rate and concurrency budget. | Preserves the requested workload without allowing retry traffic to bypass safety limits. | Reporting distinguishes logical requests from dispatched attempts and retries. |
| 2026-08-30 | Accepted | Deliver v1 as a personal, single-user, self-hosted tool. | The tool is for the owner's projects, not a hosted multi-tenant service. | Team collaboration, tenant isolation, billing, and hosted-service operations are out of scope for v1. |
| 2026-08-30 | Accepted | Retain request metadata for 30 days and request/response body blobs for 7 days. | Preserves enough history for investigation while reducing storage and sensitive-data exposure. | Retention cleanup and a metadata-only run mode are required. |
| 2026-08-30 | Accepted | Permit authorized production-target runs only after explicit confirmation and under stricter configurable rate and concurrency caps. | Production testing is useful for a personal tool but must not begin silently or without safeguards. | Production environments require a distinct confirmation and lower defaults. |
| 2026-08-30 | Accepted | Cap v1 runs at 1,000,000 total requested dispatches, 10,000 dispatches per minute, and a minimum one-minute duration. | About 167 requests/second is a realistic, testable ceiling for the initial local Node/Redis deployment without pretending it is a distributed high-throughput service. | Higher rates require a capacity-verified distributed-worker deployment; a one-million-request run needs at least 100 minutes at the v1 ceiling. |
| 2026-08-30 | Accepted | Run the initial self-hosted deployment with Docker Compose on the owner's machine, while keeping the containers deployable to a private shared host later. | It provides the simplest development and personal-use path without closing off internal hosting. | The deployment configuration must be portable; whether v1 includes team accounts remains open. |
| 2026-08-30 | Accepted | Keep v1 owner-only; make the self-hosted deployment portable for private team hosting later. | The product begins as a personal project and does not yet need account, role, or tenancy complexity. | Team authentication, roles, and project sharing move to Phase 2. |
| 2026-08-30 | Accepted | Use MinIO in local Docker Compose through an S3-compatible storage interface. | It provides local object storage now and a provider-independent path to a hosted S3-compatible service later. | Body-blob storage must use the S3-compatible abstraction. |
| 2026-08-30 | Accepted | Accept only synthetic or anonymized CSV/JSON payload data in v1. | This protects sensitive data in local storage, logs, and AI-assisted payload generation. | Documentation and validation must warn against uploading real production data. |

## Pending Decisions

- [ ] Deployment host and object-storage provider.
- [ ] Private hosting provider for the later team-access deployment.
