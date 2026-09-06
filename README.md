# Payload Forge

Payload Forge is a personal, self-hosted REST/HTTP QA and load-testing tool. It combines controlled traffic generation, reusable payload templates, live Test Run controls, searchable Request Attempt logs, and optional AI-assisted synthetic payload generation.

Only test systems that you own or are explicitly authorized to test.

## Current capabilities

- Organize targets into Projects, Environments, and Endpoints.
- Paste or upload an OpenAPI 3.x JSON/YAML document and import selected operations as Endpoints.
- Configure ordinary Endpoint headers and encrypted Environment secret headers.
- Import an external JSON request body or an array of request bodies without using AI.
- Generate synthetic payload batches with an optional AI provider.
- Save imported or generated payloads as versioned Payload Templates.
- Run constant-rate traffic or burst traffic distributed across up to ten timed waves.
- Control maximum concurrency and apply live throttling while a Test Run is active.
- Automatically pause a Test Run when its circuit-breaker error threshold is reached.
- Pause, resume, or cancel active Test Runs.
- Monitor live throughput, success, failure, timeout, and concurrency statistics.
- Inspect p50, p90, p95, and p99 latency with in-product explanations.
- Search Request Attempts and filter by successful responses, errors, or timeouts.
- Capture request and response bodies in S3-compatible storage with redaction and size limits.
- Protect production targets with an additional confirmation and stricter configurable limits.

## Repository layout

```text
.
├── apps/
│   ├── api/                 NestJS control API, validation, OpenAPI import, and WebSocket events
│   ├── web/                 Next.js dashboard and reusable UI components
│   └── worker/              BullMQ Test Run scheduler and HTTP request executor
├── packages/
│   ├── prisma/              Prisma schema and database client
│   └── shared/              Shared Test Run contracts and secret encryption
├── docs/
│   ├── agents/              Repository guidance for coding agents
│   └── release-checklist.md Deployment and authorized smoke-test checklist
├── CONTEXT.md               Product domain terminology
├── DECISIONS.md             Architecture and product decisions
├── TODO.md                  Product backlog
├── qa-tool-spec.md          Original product specification
├── docker-compose.yml       Local PostgreSQL, Redis, MinIO, API, worker, and web stack
└── .env.example             Supported local configuration
```

## Quick start with Docker

Requirements:

- Docker with Docker Compose
- OpenSSL, used once to generate the local encryption key

1. Create the environment file:

   ```bash
   cp .env.example .env
   ```

2. Generate a 32-byte encryption key:

   ```bash
   openssl rand -base64 32
   ```

   Add the result to `SECRETS_ENCRYPTION_KEY` in `.env`.

3. If AI payload generation is required, configure `AI_API_KEY` and optionally `AI_PROVIDER`, `AI_MODEL`, and `AI_BASE_URL`. External payload import works without an AI key.

4. Start the stack:

   ```bash
   docker compose up --build
   ```

5. Open the dashboard at [http://localhost:3002](http://localhost:3002).

## Service ports

| Service       | Host address                      | Purpose                             |
| ------------- | --------------------------------- | ----------------------------------- |
| Web dashboard | `http://localhost:3002`           | Configure and monitor Test Runs     |
| API           | `http://localhost:4000/v1`        | Control API and live events         |
| API health    | `http://localhost:4000/v1/health` | Stack health check                  |
| PostgreSQL    | `localhost:5433`                  | Local persisted metadata            |
| Redis         | `localhost:6379`                  | BullMQ queue and Test Run controls  |
| MinIO         | `http://localhost:9000`           | Request/response body storage       |
| MinIO console | `http://localhost:9001`           | Local object-storage administration |

PostgreSQL listens on port `5432` inside Docker and is published as `5433` on the host.

## Create a Test Run

1. Create a Project.
2. Add an Environment with the target API base URL.
3. Add Endpoints manually or import them from an OpenAPI document.
4. Add authentication values as encrypted Environment secret headers. Add non-secret, Endpoint-specific headers on the Endpoint.
5. Import or generate payloads, select the target Endpoint, and save a Payload Template.
6. Select the Environment, Endpoint, Payload Template, Logical Request count, duration, rate strategy, and maximum concurrency.
7. Review the target and safety acknowledgements, then start the Test Run.
8. Monitor the live cockpit and inspect individual Request Attempts or captured bodies.

### External payload templates

Payload Lab accepts either one JSON object:

```json
{
  "incomingImageId": 1,
  "sourceType": "EScript"
}
```

or an array of JSON objects:

```json
[
  { "incomingImageId": 1, "sourceType": "EScript" },
  { "incomingImageId": 2, "sourceType": "EScript" }
]
```

Imported payloads are validated locally, shown in full in Batch Preview, and never sent to the AI provider. **Copy JSON** copies the complete imported batch.

The worker cycles through a Payload Template when a Test Run contains more Logical Requests than template items. For example, a ten-item template used for 100 Logical Requests sends each template item ten times. APIs with duplicate detection may skip repeated identifiers, so use unique identifiers when every Logical Request must perform new work.

`GET` Endpoints never send a request body, even if an old Payload Template or payload sample is selected. Payload Templates are intended for methods such as `POST`, `PUT`, `PATCH`, and `DELETE`.

### Request headers

- **Environment secret headers** are suitable for API keys, bearer tokens, cookies, and other credentials. Values are encrypted before storage and are not displayed again after saving.
- **Endpoint request headers** are suitable for ordinary headers sent with every request to that Endpoint.
- For bearer authentication, use the secret header name `Authorization` and value `Bearer <token>`.

## Testing APIs on the host machine

Private, loopback, link-local, and cloud-metadata targets are blocked by default. Explicitly allow only private hosts that you own or are authorized to test.

When the worker runs directly on the host and the target API uses `localhost`:

```env
TARGET_HOST_ALLOWLIST=localhost
```

When Payload Forge runs in Docker but the target API runs on the host:

```env
TARGET_HOST_ALLOWLIST=host.docker.internal
```

Use a target base URL such as `http://host.docker.internal:3000` in that Docker configuration. Restart the API and worker after changing `TARGET_HOST_ALLOWLIST`.

## Load model and safety limits

- A **Logical Request** is one scheduled workload item.
- A **Request Attempt** is one actual HTTP dispatch. Retries create additional Request Attempts but remain associated with the same Logical Request.
- The non-production ceiling is 10,000 Logical Requests per minute, maximum concurrency 500, and 1,000,000 requested dispatches per Test Run.
- The minimum Test Run duration is one minute.
- Production defaults are stricter and configurable through `PRODUCTION_MAX_REQUESTS_PER_MINUTE` and `PRODUCTION_MAX_CONCURRENCY`.
- Every Test Run requires ownership or authorization acknowledgement. Production Environments require an additional confirmation.
- The default circuit breaker pauses after at least 20 completed Logical Requests when the error rate reaches 20%.

## Local development

Install dependencies and generate the Prisma client:

```bash
npm install
npm run db:generate --workspace @payload-forge/prisma
```

Useful verification commands:

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Run the web workspace in development mode:

```bash
npm run dev
```

The development dashboard uses port `3002`. The supporting API, worker, PostgreSQL, Redis, and MinIO services must also be running.

## Data retention and handling

- Use only synthetic or anonymized payload data.
- Request metadata is retained for 30 days by default.
- Local MinIO body objects expire after seven days.
- Captured bodies are limited by `MAX_CAPTURED_BODY_BYTES` and can be disabled with `CAPTURE_BODIES=false`.
- Sensitive configured fields and common authentication headers are redacted from persisted Request Attempt data.

See [the MVP release checklist](docs/release-checklist.md) before making a deployment available.
