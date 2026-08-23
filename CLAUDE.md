# Applikon — CLAUDE.md

Job application tracker for Polish IT candidates.
Stack: Java 21 / Spring Boot 3.4 (backend) · React 19 / TypeScript / Vite (frontend) · PostgreSQL · Docker Compose.

## Secret handling
- Never open or print `.env`, `.env.*`, private keys, tokens, OAuth secrets, or production credentials.
- Use environment variable names only.
- Update `.env.example`, never `.env`.
- Do not include secrets in logs, commits, tests, docs, or changelog.

## Commands

**Backend** (`applikon-backend/`):
```bash
./mvnw test           # run all tests
./mvnw spring-boot:run  # run app locally (needs Postgres + .env)
./mvnw package        # build jar
```

**Frontend** (`applikon-frontend/`):
```bash
npm run dev           # dev server on :5173
npm test              # vitest watch
npm run test:run      # vitest single run
npm run lint          # eslint
npm run build         # production build
npm run e2e           # cypress E2E
```

**Full stack:** `docker-compose up` from repo root.

## Working Agreement

**Commits — never commit autonomously.** Always propose using Conventional Commits:
```
type(scope): description
```
Types: `feat` · `fix` · `refactor` · `test` · `docs` · `chore`
Scopes: `backend` · `frontend` · `spec` · `db` · `infra`

Add a short body (2-4 sentences) explaining *why*, not *what* — the diff already shows what changed. No file lists, no essays.

```
feat(backend): add screening answers export to PDF

Recruiters ask for a printable version of prep answers before interviews.
Reuses the existing PDF generation pipeline from CVService instead of
adding a new dependency.
```

```
fix(backend): correct inconsistent ApplicationResponse post-save fetch return

Save endpoint was returning the pre-update entity state, so the frontend
showed stale status right after a stage change. Re-fetches the entity
after save instead of mapping the detached instance.
```

```
refactor(frontend): rename kanban/types.ts to kanban.ts

The file held runtime constants and a function, not just the KanbanStatus
type, so the name was misleading. No behavior change.
```

**Important:** Commits should NOT include `Co-Authored-By` trailers. User commits alone.

**Other rules:**
- No features/abstractions beyond what was asked
- When changing behavior, check if it conflicts with the release `as-built.md` docs (`spec/v*/X.Y.0/as-built.md`)
- Code, commits, and docs stay in English
- Read actual code before suggesting modifications

## Where to look for deeper context

| Need | Read                                                   |
|------|--------------------------------------------------------|
| User-facing project overview | `README.md`                                            |
| Architecture / DB schema / REST endpoints / FE components (v1 + v2) | `spec/architecture.md`                              |
| Security flow / filter chain / tokens / headers / CORS | `spec/security.md`                                     |
| Original vision / problem / MVP scope | `spec/v1/1.0.0/01-vision/brief.md`                           |
| Plan vs reality (per release) | `as-built.md` in each release folder, e.g. `spec/v1/1.0.0/as-built.md`, `spec/v2/2.0.0/as-built.md` |
| Spec index | `spec/README.md`                                       |
| Current version era (planning + build) | `spec/v2/` — shipped releases in `2.0.0/`, `2.1.0/`; current work in `2.2.0/` (topic `04-question-kind/`) |
| Spec-driven process + document templates | `spec/PROCESS.md`                                       |
| Deploy instructions | `spec/deployment/deployment-hetzner.md` (step-by-step) |
