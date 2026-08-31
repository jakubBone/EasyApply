# 💼 Applikon

![Version](https://img.shields.io/badge/v-2.2.0-green.svg)
![Java](https://img.shields.io/badge/Java-21-007396?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?style=flat&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat&logo=springsecurity&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
[![CI](https://github.com/jakubBone/applikon/actions/workflows/ci.yml/badge.svg)](https://github.com/jakubBone/applikon/actions/workflows/ci.yml)

**Applikon** is a job application tracker for IT candidates in Poland. One place for applications,
CVs and interview notes, instead of scattered spreadsheets and expired links.

`162 backend tests` · `21 Flyway migrations` · `4 releases since May 2026` · `deployed on a VPS behind HTTPS`

<div align="center">

[![Applikon screenshot](.github/assets/app-preview.png)](https://aplikujbezspiny.pl)
<br>

[![WATCH VIDEO DEMO](https://img.shields.io/badge/%20WATCH%20VIDEO%20DEMO%20(PL)-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=sqIwGYWYn_E)
[![Full App](https://img.shields.io/badge/▶%20%20OPEN%20FULL%20APPLICATION-22C55E?style=for-the-badge)](https://aplikujbezspiny.pl)
<br>

> 📌 **Quick note**: This video uses the former name **EasyApply**, now rebranded to **💼 Applikon**.
</div>

## ✨ Features

- **Kanban board** - every application as a card, Sent → In progress → Finished, drag & drop
- **Recruitment stage** - on the card: HR call, technical, manager, recruitment task, final
- **Application card** - salary, job source and link, a copy of the ad for when it expires
- **CVs and notes** - the version you sent, and what was said in every conversation
- **Screening cheat sheet** - your standard answers, the company note and your salary, on one screen
- **Company brief** - *"what do you know about us?"* from public web data, once per company, editable
- **Board cleanup** - 60 days in "Sent" means rejected: flagged, archived in one click
- **Your data** - Google sign-in, PL/EN, JSON export, and deletion that really deletes

Plus badges for collecting rejections, service notices, and Swagger UI over every endpoint.

## 🏗 Architecture

Layered Spring Boot monolith, PostgreSQL behind Flyway, React SPA over REST.
One deployable unit, one database, on purpose.

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

- The access token is validated before any application code runs
- `MdcUserFilter` puts the user id into the logging context - every log line attributable, no email ever logged
- Entities never leave the service layer; responses are DTO records

Full reference: [`spec/architecture.md`](spec/architecture.md)

## ⚖️ Engineering decisions & trade-offs

A row gets in only if I can name what I rejected and what it costs me.
Full set in [`spec/adr/`](spec/adr/).

| Decision | Rejected, and why | What it costs |
|---|---|---|
| [**Monolith + one Postgres, one VPS**](spec/adr/ADR-v1-004-monolith-single-vps.md) | Microservices - ops cost, no user-facing benefit at this scale | Single point of failure, no horizontal scaling |
| [**Layered, not hexagonal**](spec/adr/ADR-v1-005-layered-not-hexagonal.md) | Ports and adapters - one DB, one entry channel, pure ceremony here | Business logic knows about JPA |
| [**Google OAuth2, no passwords of my own**](spec/adr/ADR-v1-001-oauth2-jwt.md) | Own accounts - password storage, reset flow, breach surface | No Google account, no registration |
| [**15-min JWT + 7-day refresh cookie**](spec/adr/ADR-v1-001-oauth2-jwt.md) | Server-side sessions, or one long-lived JWT | More moving parts; refresh tokens stored as HMAC digests |
| [**RSA key generated in memory at startup**](spec/adr/ADR-v1-006-in-memory-rsa-key.md) | Key from env as PEM - no key management for one instance | Restart invalidates every JWT. **Breaks on a second instance** |
| [**Flyway, Hibernate in `validate`**](spec/adr/ADR-v1-002-flyway-versioned-migrations.md) | `ddl-auto=update` - schema becomes whatever Hibernate inferred, reviewed by nobody | A shipped migration is immutable |
| [**No soft delete**](spec/adr/ADR-v1-008-no-soft-delete.md) | A `deleted` flag - GDPR Art. 17 asks for erasure | No undo; export covers the user first |
| [**AI provider behind a port**](spec/adr/ADR-v2-001-brief-provider-strategy.md) | Vendor SDK in the service - free tiers move, Gemini's closed mid-build | A dormant adapter that still has to compile |
| [**Async brief via transactional event**](spec/adr/ADR-v2-002-in-process-async-brief-generation.md) | A queue - separate infrastructure for one use case | No retries; a failed brief waits for the user |

## 🧪 Testing

Five levels, unit to end-to-end. `DataIsolationTest` is the one worth naming: it creates data as
user A, authenticates as user B, and asserts every route refuses - multi-tenant leakage is tested
explicitly, not assumed.

<details>
<summary><b>Levels and tooling</b></summary>

| Level | Tooling | What it covers |
|---|---|---|
| Unit | JUnit 5 + Mockito | service logic, collaborators mocked |
| Web layer | MockMvc | status codes, validation, JSON contract |
| Integration | `@SpringBootTest` + H2 | security, transactions, repositories |
| Frontend | Vitest + Testing Library | components and hooks |
| End to end | Cypress | application CRUD, badges, cheat sheet, company brief |

CI runs both suites and a production build on every push, then publishes both images to GHCR.

</details>

## 🚧 Known limitations

| Limitation | Why it is fine now | What would force the fix |
|---|---|---|
| **Runs as one copy of the backend only.** Every start generates a fresh RSA signing key, so a second copy would reject the tokens the first one issued | One VPS, one container, restarts in seconds | Traffic outgrowing one machine, or wanting deploys with no logged-out users |
| **`GET /api/applications` is unpaginated** | Real usage is 10-20 a month | The first board slow enough to notice |
| **A failed brief is not retried** | One optional feature, and it fails visibly | Failures frequent enough to lose trust |
| **Rotating `APP_TOKEN_HMAC_SECRET` logs everyone out** | Blast radius is one re-login | An incident, or a rotation policy |
| **CV upload disabled** (503); links only | Hosting personal documents was a liability I did not want | A retention story I can defend |

## 🔒 Privacy & Data

The app stores which companies rejected you and what salary you asked for, so it is built to
give away as little as possible - refresh tokens are unusable if the database leaks, and the AI
provider only ever learns a company name.

<details>
<summary><b>What that means concretely</b></summary>

- **Refresh tokens** stored only as HMAC-SHA256 digests keyed with a server secret - a database dump yields nothing usable
- **Logs** contain UUIDs only - no emails, names or tokens
- **Account deletion** removes everything; inactive accounts purged after 12 months
- **Company brief** sends only the company name to the AI provider - never notes or applications

Full rationale: [`spec/v1/1.0.0/07-privacy-rodo/`](spec/v1/1.0.0/07-privacy-rodo/)

</details>

## 🧠 How this was built

Written with **Claude Code** in a spec-first loop. Nothing was implemented before a plan existed,
and no plan was written without stating what was **out of scope**. The specs live in the repo,
not in a chat log.

🟦 **Specify** → 🟪 **Plan** → 🟧 **Implement** → 🟥 **Use it for real** → back to 🟦 ↺

|     | Stage | What it produces |
|-----|-------|------------------|
| 🟦  | **Specify** | the problem, the user, **what is out of scope**, user stories with acceptance criteria |
| 🟪  | **Plan** | implementation steps, each ending with tests |
| 🟧  | **Implement** | code against the plan - one Conventional Commit per step |
| 🟥  | **Use it for real** | ship it, then job-hunt with it. Where reality disagrees, that goes in `as-built.md` and becomes the next **Specify** - never a rewrite of the last one |
| 🟨  | **Review** | findings classified Critical / Important / Nice-to-have, each tracked until closed |

Review ran once, over the v1 MVP: 23 findings classified Critical / Important / Nice-to-have, all
fixed and tested - [`04-mvp-refactoring`](spec/v1/1.0.0/04-mvp-refactoring/).

Map: [`spec/README.md`](spec/README.md) · Process: [`spec/PROCESS.md`](spec/PROCESS.md)

## 🐳 Run it yourself

> Just want to see it? Open the [live version](https://aplikujbezspiny.pl) - nothing to install.

<details>
<summary><b>Docker setup (about 5 minutes)</b></summary>

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Step 1 - Google OAuth credentials (required for login)

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
5. Copy the **Client ID** and **Client Secret**.

### Step 2 - Configure and start

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Value |
|----------|-------|
| `POSTGRES_USER` | any username, e.g. `applikon` |
| `POSTGRES_PASSWORD` | any password |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` |
| `FRONTEND_URL` | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | from Step 1 |
| `GOOGLE_CLIENT_SECRET` | from Step 1 |
| `ADMIN_KEY` | any random string, e.g. `openssl rand -base64 32` |
| `APP_TOKEN_HMAC_SECRET` | any random string, e.g. `openssl rand -base64 32` |
| `GROQ_API_KEY` | free key from [console.groq.com/keys](https://console.groq.com/keys) - powers the company brief |

> AI keys may be left empty - the app still starts, only brief generation fails.
> `GEMINI_API_KEY` is an alternative provider, off by default.

```bash
docker compose up --build
```

Open `http://localhost:3000`.

Production images, published to GHCR on every `main` build:
```
ghcr.io/jakubbone/applikon-backend:latest
ghcr.io/jakubbone/applikon-frontend:latest
```

The live instance runs on a Hetzner VPS behind Caddy - runbook in
[`spec/deployment/deployment-hetzner.md`](spec/deployment/deployment-hetzner.md).

</details>

<details>
<summary><b>Repo tooling (<code>.claude/</code>)</b></summary>

```
.claude/
├── commands/
│   ├── commit-assistant.md                ← propose Conventional Commit
│   └── changelog-manager.md               ← automated CHANGELOG.md
└── skills/
    ├── spec-assistant/                    ← spec-driven planning: idea → user stories → plan
    ├── code-review-backend/               ← Java 21 / Spring Boot 3.4 reviewer
    ├── code-review-frontend/              ← React 19 / TypeScript reviewer
    └── security-auditor/                  ← OWASP Top 10 read-only auditor
```

</details>
