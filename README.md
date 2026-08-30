# Payload Forge

Personal, self-hosted REST/HTTP load testing with controlled traffic, searchable Request Attempt logs, and AI-assisted synthetic payload generation.

## Local setup

1. Copy `.env.example` to `.env`.
2. Generate `SECRETS_ENCRYPTION_KEY` with `openssl rand -base64 32` and add it to `.env`.
3. Add `ANTHROPIC_API_KEY` if AI payload generation is required.
4. Run `docker compose up --build`.
5. Open `http://localhost:3000`. MinIO console is at `http://localhost:9001`.

If port 3000 is already in use, set `WEB_PORT` and `WEB_ORIGIN` together in `.env` (for example, `WEB_PORT=3001` and `WEB_ORIGIN=http://localhost:3001`).

Private, loopback, link-local, and cloud-metadata targets are blocked by default. For an API you intentionally run on a private network, add its hostname to `TARGET_HOST_ALLOWLIST`.

See [the MVP release checklist](docs/release-checklist.md) before making a deployment available.

## Development

```bash
npm install
npm run db:generate --workspace @payload-forge/prisma
npm run typecheck
npm test
```

The API runs on port 4000, dashboard on port 3000, PostgreSQL on port 5432, Redis on port 6379, and MinIO on ports 9000/9001.
