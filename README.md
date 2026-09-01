# Payload Forge

Personal, self-hosted REST/HTTP load testing with controlled traffic, searchable Request Attempt logs, and AI-assisted synthetic payload generation.

## Local setup

1. Copy `.env.example` to `.env`.
2. Generate `SECRETS_ENCRYPTION_KEY` with `openssl rand -base64 32` and add it to `.env`.
3. Add `AI_API_KEY` (and optional `AI_MODEL` / `AI_BASE_URL`) if AI payload generation is required.
4. Run `docker compose up --build`.
5. Open `http://localhost:3002`. MinIO console is at `http://localhost:9001`.

Private, loopback, link-local, and cloud-metadata targets are blocked by default. For an API you intentionally run on a private network, add its hostname to `TARGET_HOST_ALLOWLIST`.

See [the MVP release checklist](docs/release-checklist.md) before making a deployment available.

## Development

```bash
npm install
npm run db:generate --workspace @payload-forge/prisma
npm run typecheck
npm test
```

The API runs on port 4000, dashboard on port 3002, PostgreSQL on port 5433/5432, Redis on port 6379, and MinIO on ports 9000/9001.
