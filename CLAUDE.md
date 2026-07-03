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
Example: `refactor(backend): extract validation into ApplicationValidator`

**Important:** Commits should NOT include `Co-Authored-By` trailers. User commits alone.

**Other rules:**
- No features/abstractions beyond what was asked
- When changing behavior, check if it conflicts with `spec/v1/as-built.md`
- Code, commits, and docs stay in English
- Read actual code before suggesting modifications

## Where to look for deeper context

| Need | Read                                                   |
|------|--------------------------------------------------------|
| User-facing project overview | `README.md`                                            |
| Architecture / DB schema / REST endpoints / FE components (v1 + v2) | `spec/architecture.md`                              |
| Security flow / filter chain / tokens / headers / CORS | `spec/v1/security.md`                                  |
| Original vision / problem / MVP scope | `spec/v1/01-vision/brief.md`                           |
| Plan vs reality / phase history | `spec/v1/as-built.md`                                  |
| Spec phases index | `spec/README.md`                                       |
| Current next version (planning + build) | `spec/v2/` (`01-brief/` → `02-user-stories/` → `03-plan/`; later phases in `04-cheat-sheet-consolidation/`; `as-built.md` is the living current-state doc) |
| Spec-driven process / per-version artifact map | `spec/PROCESS.md`                                       |
| Deploy instructions | `spec/deployment/deployment-hetzner.md` (step-by-step) |
