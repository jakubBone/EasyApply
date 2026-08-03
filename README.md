# 💼 Applikon

![Version](https://img.shields.io/badge/v-2.1.0-green.svg)
![Java](https://img.shields.io/badge/Java-21-007396?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?style=flat&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat&logo=springsecurity&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
[![CI](https://github.com/jakubBone/applikon/actions/workflows/ci.yml/badge.svg)](https://github.com/jakubBone/applikon/actions/workflows/ci.yml)

**Applikon** is a job application tracker for IT candidates in Poland. One place for applications, CVs, and interview notes, instead of scattered spreadsheets and expired links. Designed for anyone actively applying to multiple positions at once.

<div align="center">

[![Applikon screenshot](.github/assets/app-preview.png)](https://aplikujbezspiny.pl)
<br>

[![WATCH VIDEO DEMO](https://img.shields.io/badge/%20WATCH%20VIDEO%20DEMO%20(PL)-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=sqIwGYWYn_E)
[![Full App](https://img.shields.io/badge/▶%20%20OPEN%20FULL%20APPLICATION-22C55E?style=for-the-badge)](https://aplikujbezspiny.pl)
<br>

> 📌 **Quick note**: This video uses the former name **EasyApply**, now rebranded to **💼 Applikon**.
</div>

## ✨ Features

- **Application registry** - company, position, salary, job source, link to posting
- **Kanban board** - visual overview of recruitment status: Sent → In progress → Completed, with drag & drop
- **Recruitment stages** - tracking current stage: HR interview, technical interview, manager interview, recruitment task, final interview
- **CV archive** - storing different CV versions and assigning them to specific applications
- **Notes** - saving interview questions, feedback, and personal thoughts for each application 
- **Job posting archive** - copy of the job description in case the link expires
- **Badge system** - achievements for rejections and ghosting (gamification)
- **Authentication** - Google OAuth2 login, JWT access token + refresh token
- **i18n** - Polish and English interface with a language switcher
- **Settings** - account management: change display name, delete account
- **Data export** - download all personal data as JSON (RODO Art. 20)
- **Service notices** - system announcements displayed on login (maintenance, updates)
- **API documentation** - Swagger UI with all endpoints, schemas, and authorization
- **Screening cheat sheet** - a "General" answers template (written once) plus a per-application "About the company" note, composed with the proposed salary on one screen before a recruiter call
- **Board cleanup** - flags applications stuck in "Sent" for 60+ days with no response, with one-click archiving
- **Company brief** - AI-generated summary of the company (industry, product and customers, tech stack, size and stage), generated once per company, reused across applications and editable by hand


## 🏗 Architecture

A layered Spring Boot monolith - `controller → service → repository` - with PostgreSQL behind
Flyway migrations and a React SPA talking to it over REST. One deployable unit, one database,
on purpose.

```
Browser  ·  React 19 + React Query
   │ HTTPS
Caddy  ·  reverse proxy, TLS
   │
Spring Boot 3.4
   ├─ filters      CORS → AdminKeyFilter → JWT validation → JwtAuthenticationConverter → ConsentRequiredFilter
   ├─ controller   @Valid on the request DTO - rejected input never reaches the service
   ├─ service      @Transactional; every query scoped by the authenticated user id
   └─ repository   Spring Data JPA
   │
PostgreSQL 16  ·  schema owned by Flyway; Hibernate runs in `validate` mode only
```

**One request, end to end.** The access token is validated before any application code runs;
the converter turns its `sub` claim into an `AuthenticatedUser` principal, and `MdcUserFilter`
puts that user id into the logging context - so every log line for the request is attributable
without an email ever reaching the logs. Responses are DTO records; entities never leave the
service layer.

Full reference - packages, every endpoint, schema, component tree:
[`spec/architecture.md`](spec/architecture.md).

## ⚖️ Engineering decisions & trade-offs

Recorded as ADRs, with context, decision and consequences:

| Decision | Why | What it costs |
|---|---|---|
| [Google OAuth2 + JWT](spec/adr/ADR-v1-001-oauth2-jwt.md) | no passwords stored, no reset flow, no credential breach surface | a hard dependency on one provider; no Google account, no login |
| [Flyway, `ddl-auto=validate`](spec/adr/ADR-v1-002-flyway-versioned-migrations.md) | every schema change is a reviewable commit; checksums stop silent edits | a deployed migration is immutable - a fix has to be a new one |
| [React Query for server state](spec/adr/ADR-v1-003-react-query.md) | caching, retries and invalidation are the usual bug source when hand-rolled | one more library, and a cache to reason about |
| [Groq behind a `ChatModel` port](spec/adr/ADR-001-brief-provider-strategy.md) | free tiers move; the provider had to be swappable by config, not by code | a second, dormant adapter to keep working |
| [In-process async, no broker](spec/adr/ADR-003-in-process-async-brief-generation.md) | one deliberate click per brief - a queue would be infrastructure without a reason | a brief in flight is lost if the process dies; it ends `FAILED` and the user retries |
| [Job-ad link dropped from the prompt](spec/adr/ADR-006-drop-job-ad-link-from-brief-prompt.md) | measured: the link changed nothing, the company name drives the result | briefs are per company, not per posting |

Decisions taken without an ADR, stated here because they shape everything above:

| Decision | Why | What it costs |
|---|---|---|
| Monolith + one Postgres on a single VPS | splitting it buys the user nothing at this size | a single point of failure and no horizontal scaling - revisited when the traffic stops fitting on one box |
| Layered, not hexagonal | one database, one entry channel; ports and adapters would be ceremony | business logic knows about JPA. A second entry channel is the trigger to change this |
| RSA signing key generated in memory at startup | no key management needed for a single instance | a restart invalidates every access token (they live 15 minutes) - **and it breaks outright on a second instance** |
| Account deletion really deletes - no soft delete | GDPR Art. 17 asks for erasure, not a flag | no undo, which is why data export exists first |

## 🧪 Testing

Tested at four levels, each answering a different question:

| Level | Tooling | What it covers |
|---|---|---|
| Unit | JUnit 5 + Mockito | service logic in isolation, collaborators mocked |
| Web layer | MockMvc | status codes, validation, JSON contract - no server, no network |
| Integration | `@SpringBootTest` + H2 | the wired context: security, transactions, repositories |
| Frontend | Vitest + Testing Library | components and hooks |
| End to end | Cypress | application CRUD, badges, cheat sheet, company brief |

`DataIsolationTest` is the one worth singling out: it creates data as user A, authenticates as
user B, and asserts every route refuses. Multi-tenant leakage is the failure this project can
least afford, so it is tested explicitly rather than assumed.

CI runs backend tests, frontend tests and a production build on every push, then publishes both
images to GHCR - [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## 🐳 Run it yourself (Docker)

> Just want to see the app? Open the [live version](https://aplikujbezspiny.pl) - nothing to install.
> This section is for running your own instance.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Step 1 - Google OAuth credentials (required for login)

The app uses Google login, so it needs credentials of your own - a one-time setup in Google Cloud Console, about 5 minutes.

<details>
<summary><b>Show the steps</b></summary>

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and sign in.
2. Create a new project (top-left dropdown → **New Project**).
3. In the left menu go to **APIs & Services → OAuth consent screen**.
   - Choose **External**, click **Create**.
   - Fill in **App name** (e.g. `Applikon`), **User support email**, and **Developer contact email**. Save.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Under **Authorized redirect URIs** add exactly:
     ```
     http://localhost:8080/login/oauth2/code/google
     ```
   - Click **Create**.
5. Copy the **Client ID** and **Client Secret** - you will need them in the next step.

</details>

### Step 2 - Configure and start

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | Value |
|----------|-------|
| `POSTGRES_USER` | any username, e.g. `applikon` |
| `POSTGRES_PASSWORD` | any password |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` |
| `FRONTEND_URL` | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | from Step 1 |
| `GOOGLE_CLIENT_SECRET` | from Step 1 |
| `ADMIN_KEY` | any random string, e.g. output of `openssl rand -base64 32` |
| `APP_TOKEN_HMAC_SECRET` | any random string, e.g. output of `openssl rand -base64 32` |
| `GROQ_API_KEY` | free key from [console.groq.com/keys](https://console.groq.com/keys) - powers company brief generation |

> Both AI keys may be left empty - the app still starts, only brief generation fails.
> `GEMINI_API_KEY` is an alternative provider, off by default.

Then start the app:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

Production images (published to GHCR on every `main` build):
```
ghcr.io/jakubbone/applikon-backend:latest
ghcr.io/jakubbone/applikon-frontend:latest
```

The live instance runs on a Hetzner VPS behind a Caddy reverse proxy - the full
deployment runbook is in [`spec/deployment/deployment-hetzner.md`](spec/deployment/deployment-hetzner.md).


## 🔒 Privacy & Data

- **Refresh tokens** are stored only as HMAC-SHA256 digests, keyed with a server-side secret - the stored value cannot be replayed, so a database dump yields no usable tokens. Access tokens are stateless and never stored at all
- **Logs** contain UUIDs only - no emails, names, or tokens in plaintext
- **Account deletion** permanently removes all data; inactive accounts purged after 12 months
- **Company brief** sends only the company name to the AI provider - never your notes, applications, or personal data

Full design rationale: [`spec/v1/1.0.0/07-privacy-rodo/`](spec/v1/1.0.0/07-privacy-rodo/)

## 🧠 How this was built

Written with **Claude Code** in a spec-first loop: nothing was implemented before a plan
existed, and no plan was written without stating what was **out of scope**. The specs live in
the repo rather than in a chat log - `spec/` holds the vision, the per-release plans, the ADRs
linked above, and an `as-built.md` per release recording where reality diverged from the plan.

Currently on **v2 - Screening Companion** (`spec/v2/`), built on top of the **v1 MVP**
(`spec/v1/`).

🟦 **Specify** → 🟪 **Plan** → 🟧 **Implement** → 🟥 **Use it for real** → back to 🟦 ↺

|     | Stage | What it produces |
|-----|-------|------------------|
| 🟦  | **Specify** | the idea, user, scope, **out of scope**, user stories with acceptance criteria |
| 🟪  | **Plan** | implementation steps, with tests batched at the end of each stage |
| 🟧  | **Implement** | code against the plan - each step with tests, a DoD and a Conventional Commit |
| 🟥  | **Use it for real** | ship it, then dogfood it. If reality disagrees, that is the next **Specify** - never a rewrite of the last one |
| 🟨  | **Review** | findings classified Critical / Important / Nice-to-have until each is closed |
| 🟩  | **Refactor** | fixes applied alongside learning: explain → fix → control questions → notes |

Review and Refactor ran once, for the v1 MVP; both stay available as dedicated skills.

Start with [`spec/README.md`](spec/README.md) for the map and
[`spec/PROCESS.md`](spec/PROCESS.md) for the process itself.

<details>
<summary><b>Repo tooling (<code>.claude/</code>)</b></summary>

```
.claude/
├── commands/
│   ├── commit-assistant.md                ← propose Conventional Commit
│   ├── changelog-manager.md               ← automated CHANGELOG.md
│   ├── mentor-refactor-backend.md         ← backend refactor + learning (**AI mentor mode**)
│   └── mentor-refactor-frontend.md        ← frontend refactor + learning (**AI mentor mode**)
└── skills/
    ├── spec-assistant/                    ← spec-driven planning: idea → user stories → plan
    │   ├── SKILL.md
    │   └── references/
    ├── code-review-backend/               ← Java 21 / Spring Boot 3.4 reviewer
    │   ├── SKILL.md
    │   └── references/
    ├── code-review-frontend/              ← React 19 / TypeScript reviewer
    │   ├── SKILL.md
    │   └── references/
    └── security-auditor/                  ← OWASP Top 10 read-only auditor (no code modifications)
        └── SKILL.md
```

</details>

