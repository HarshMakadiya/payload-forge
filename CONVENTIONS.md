# CONVENTIONS.md

> Companion to `qa-tool-spec.md`. This file defines the coding, structure, and workflow conventions to follow when building the QA/load-testing tool. Meant to be handed to an AI assistant (or a dev) alongside the spec so generated code is consistent from the first line, not just the first feature.

---

## 1. Language & Tooling

- **TypeScript everywhere** (api, worker, frontend) — strict mode on (`"strict": true` in tsconfig).
- **Formatting**: Prettier, default config (2-space indent, single quotes, trailing commas — es5).
- **Linting**: ESLint with `@typescript-eslint`, no unused vars/imports allowed to merge.
- No `any` unless truly unavoidable (external untyped payloads) — prefer `unknown` + narrowing.
- Package manager: pick one (npm/pnpm/yarn) and commit the lockfile — don't mix.

---

## 2. Project Structure

Monorepo layout:

```
/apps
  /api        → NestJS HTTP service (CRUD, run orchestration)
  /worker     → NestJS worker (BullMQ consumer, load dispatch)
  /web        → Next.js dashboard
/packages
  /shared     → shared types/DTOs used by api, worker, and web
  /prisma     → schema.prisma + migrations (single source of truth for DB shape)
```

- No app imports directly from another app's internals — shared types/contracts live in `packages/shared` only.
- Each NestJS app follows Nest's module-per-feature structure: `modules/<feature>/<feature>.module.ts|.controller.ts|.service.ts`.

---

## 3. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `test-run.service.ts` |
| Classes / Interfaces / Types | PascalCase | `TestRun`, `CreateRunDto` |
| Variables / functions | camelCase | `getRunStatus()` |
| Constants (true constants) | UPPER_SNAKE_CASE | `MAX_CONCURRENT_REQUESTS` |
| DB tables & columns | snake_case | `test_run`, `created_at` |
| BullMQ queue/job names | kebab-case, prefixed by domain | `run.dispatch-request` |
| Env vars | UPPER_SNAKE_CASE | `DATABASE_URL`, `ANTHROPIC_API_KEY` |
| React components | PascalCase, one per file | `RunStatusPanel.tsx` |

- Booleans read as questions: `isRunning`, `hasFailed` — not `running`, `failed_flag`.
- No abbreviations unless universally clear (`id`, `url`, `db` are fine; `cfg`, `mgr` are not).

---

## 4. API Design

- REST, resource-based paths, plural nouns: `/projects`, `/projects/:id/runs`, `/runs/:id/logs`.
- Every response follows one envelope shape:
  ```json
  { "data": {...}, "error": null }
  ```
  or on failure:
  ```json
  { "data": null, "error": { "code": "RUN_NOT_FOUND", "message": "..." } }
  ```
- Error codes are stable string identifiers (`RUN_NOT_FOUND`), not just HTTP status — frontend and logs key off the code, not the message text.
- Validate all incoming bodies with DTOs + `class-validator` at the controller boundary — services never trust raw input.
- Versioning: prefix routes with `/v1` from day one, even with only one version live.

---

## 5. Database & Prisma

- Prisma is the single source of truth for schema — no manual SQL migrations unless Prisma can't express something.
- Every table has `id` (uuid), `created_at`, `updated_at`.
- Soft-delete over hard-delete for anything a user might want to recover (Projects, Collections) — hard-delete is fine for high-volume ephemeral data (RequestLog rows past retention).
- Foreign keys are always indexed.
- No business logic in the DB (no triggers/stored procedures) — logic lives in service layer.

---

## 6. Error Handling & Logging

- Never swallow errors silently — catch, log with context, then either handle or rethrow as a typed exception.
- Use NestJS's exception filters for a consistent error → HTTP response mapping.
- Structured logging (JSON logs), not `console.log` — include `requestId`/`runId` in every log line so a run's logs can be traced end-to-end.
- Worker jobs: on failure, log the failure reason and update the job's status in the DB — never let a failed job disappear silently from the queue without a trace.

---

## 7. Testing

- Unit tests colocated with source: `test-run.service.spec.ts` next to `test-run.service.ts`.
- Integration tests for anything touching the DB or queue, in a separate `/test` folder per app.
- Minimum bar: every service method that contains a conditional/branch has at least one test per branch — not 100% coverage for its own sake, but no untested branching logic.
- Mock external calls (target APIs being load-tested, Claude API) in tests — tests must not make real network calls.

---

## 8. Git & Commits

- Conventional Commits format: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
  - Example: `feat(worker): add ramp-up rate strategy`
- Branch naming: `feature/<short-desc>`, `fix/<short-desc>`.
- One logical change per commit — don't bundle an unrelated refactor with a feature commit.
- PR description (even for solo work, for your own future reference) should state *what* and *why*, not just *what*.

---

## 9. Environment & Config

- All config via environment variables, validated at startup (fail fast if a required var is missing) — no silent fallback to a wrong default for anything security- or correctness-critical.
- `.env.example` committed with every required var listed (empty/placeholder values) — `.env` itself never committed.
- Secrets (API keys, target-project auth tokens) never logged, never returned in API responses — mask in any debug output.

---

## 10. Documentation

- Every module gets a short `README.md` if its purpose isn't obvious from the folder name alone.
- Complex logic (rate-strategy calculations, payload mutation logic) gets inline comments explaining *why*, not *what* — the code already says what.
- Keep `qa-tool-spec.md` as the source of truth for product scope; this file (`CONVENTIONS.md`) as the source of truth for how code is written. Don't duplicate one into the other.
