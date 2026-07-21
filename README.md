# 💼 Applikon

![Version](https://img.shields.io/badge/v-2.0.0-green.svg)
![Java](https://img.shields.io/badge/Java-21-007396?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?style=flat&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat&logo=springsecurity&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![Flyway](https://img.shields.io/badge/Flyway-CC0200?style=flat&logo=flyway&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![React Query](https://img.shields.io/badge/React_Query-FF4154?style=flat&logo=reactquery&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat&logo=swagger&logoColor=black)
![Cypress](https://img.shields.io/badge/Cypress-69D3A7?style=flat&logo=cypress&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)
[![CI](https://github.com/jakubBone/applikon/actions/workflows/ci.yml/badge.svg)](https://github.com/jakubBone/applikon/actions/workflows/ci.yml)


![Claude Code](https://img.shields.io/badge/Claude_Code-D97706?style=flat&logo=anthropic&logoColor=white)
![Spec-Driven](https://img.shields.io/badge/Spec--Driven-1F2937?style=flat)

**Applikon** is a job application tracker for IT candidates in Poland. One place for applications, CVs, and interview notes, instead of scattered spreadsheets and expired links. Designed for anyone actively applying to multiple positions at once.

<div align="center">

[![Applikon screenshot](.github/assets/app-preview.png)](https://aplikujbezspiny.pl)
<br>

[![WATCH VIDEO DEMO](https://img.shields.io/badge/%20WATCH%20VIDEO%20DEMO%20(PL)-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=sqIwGYWYn_E)
[![Full App](https://img.shields.io/badge/▶%20%20OPEN%20FULL%20APPLICATION-22C55E?style=for-the-badge)](https://aplikujbezspiny.pl)
<br>

> 📌 **Quick note**: This video uses the former name **EasyApply**, now rebranded to **💼 Applikon**.
</div>

## 🧠 Spec-Driven Development with AI

Built with **Claude Code** using a strict spec-first approach. No code was written
without a plan first; no plan was written without knowing what *not* to do.

Currently on **v2 - Screening Companion** (`spec/v2/`): a screening cheat sheet and
board cleanup, built on top of the **v1 MVP** (`spec/v1/`).

🟦 **Specify** → 🟪 **Plan** → 🟧 **Implement** → 🟥 **Use it for real** → back to 🟦 ↺
*(🟨 Review and 🟩 Refactor ran once, for the v1 MVP - available anytime since via dedicated skills.)*

|     | Stage          | What it produces                                                                                                       |
|-----|----------------|--------------------------------------------------------------------------------------------------------------------------|
| 🟦  | **Specify**    | The idea, user, scope, **out of scope**, user stories with acceptance criteria.                                          |
| 🟪  | **Plan**       | Implementation steps with tests batched at the end of each stage.                                                        |
| 🟧  | **Implement**  | Code against the plan - each step with tests, DoD, and a Conventional Commit.                                            |
| 🟥  | **Use it for real** | Ship it, then dogfood it. If reality disagrees, that's the next **Specify** - never a rewrite of the last one.      |
| 🟨  | **Review**     | Findings classified **Critical / Important / Nice-to-have** until each is closed.                                        |
| 🟩  | **Refactor**   | Fixes applied alongside learning: explain → fix → control questions → notes (mentor mode).                               |

## 🤖 Specs & Config

- **`spec/README.md`** - start here: the spec map
- **`spec/PROCESS.md`**- the spec-driven process
- **`.claude/`** - config directory (commands + skills), shown below:

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

> `GROQ_API_KEY` must not be left empty: the backend fails to start without it.
> `GEMINI_API_KEY` can stay empty - it is an alternative provider, off by default.

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

- **Refresh tokens** stored as HMAC-SHA256 hashes - a stolen database cannot be used to hijack sessions
- **Logs** contain UUIDs only - no emails, names, or tokens in plaintext
- **Account deletion** permanently removes all data; inactive accounts purged after 12 months

Full design rationale: [`spec/v1/1.0.0/07-privacy-rodo/`](spec/v1/1.0.0/07-privacy-rodo/)

