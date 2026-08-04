# Applikon — Architecture Reference

> Source of truth: the code. This document reflects the actual implemented state.
> Originally written for v1; per `spec/PROCESS.md`, v2 gets no separate
> `architecture.md` of its own (it adds no new technology), so its schema/endpoint/
> component additions are folded into the same sections here, tagged **(v2)**.

---

## 1. Backend — Actual Architecture

### Package structure

```
com.applikon/
  ApplikonApplication.java        — main class, @SpringBootApplication, @EnableJpaAuditing, @EnableScheduling
  config/
    GeminiClientConfig.java        — (v2 03-company-brief) own Gemini `Client` bean: 60 s request timeout + blank key tolerated at startup; built only when brief.provider=gemini
    GroqClientConfig.java          — (v2 03-company-brief) own `OpenAiApi` bean for the Groq endpoint: 10 s connect / 60 s read timeout, blank key tolerated (SimpleApiKey); built only when brief.provider=groq
    I18nConfig.java                — MessageSource (i18n/messages), AcceptHeaderLocaleResolver (default: en)
    OpenApiConfig.java             — @OpenAPIDefinition (title/description/version/contact) + @SecurityScheme (JWT Bearer) (11-swagger)
    SecurityConfig.java            — Spring Security, OAuth2, JWT encoder/decoder, CORS
  controller/
    ApplicationController.java     — /api/applications
    AuthController.java            — /api/auth
    AdminController.java           — /api/admin (08-user-data)
    BriefController.java           — /api/applications/{applicationId}/brief (v2 03-company-brief)
    CVController.java              — /api/cv
    NoteController.java            — /api (nested under /applications and /notes)
    StatisticsController.java      — /api/statistics
    SystemController.java          — /api/system (08-user-data)
  dto/
    ApplicationRequest.java        — record (company, position, link, salary*, currency, salaryType, contractType, salarySource, source, jobDescription, agency)
    ApplicationResponse.java       — record (all Application fields + cv info flattened: cvId, cvFileName, cvType, cvExternalUrl)
    ApplicationStats.java          — record (rejections, ghosting, offers) — for JPQL projection
    BadgeResponse.java             — record (name, icon, description, threshold, currentCount, nextThreshold, nextBadgeName)
    BadgeStatsResponse.java        — record (rejectionBadge, ghostingBadge, sweetRevengeUnlocked, totals)
    BriefEditRequest.java          — record (fields: List<Field{fieldKey, text}>) (v2 03-company-brief)
    BriefFieldResponse.java        — record (key, texts: Map<lang, text>, edited) (v2 03-company-brief)
    BriefResponse.java             — record (status, fields) (v2 03-company-brief)
    NoteRequest.java               — record (content, category)
    NoteResponse.java              — record (id, content, category, applicationId, createdAt)
    ServiceNoticeRequest.java      — record (type, messagePl, messageEn, expiresAt) with @NotBlank @Pattern on type (08-user-data)
    ServiceNoticeResponse.java     — record (id, type, messagePl, messageEn, expiresAt) (08-user-data)
    StageUpdateRequest.java        — record (status, currentStage, rejectionReason, rejectionDetails)
    StatusUpdateRequest.java       — record (status)
    UserResponse.java              — record (id, email, name, privacyPolicyAcceptedAt) (07-privacy-rodo)
  entity/
    Application.java               — @Entity, table: applications
    CompanyBrief.java              — @Entity, table: company_briefs (v2 03-company-brief)
    CompanyBriefField.java         — @Entity, table: company_brief_fields; child side, @ManyToOne CompanyBrief
    CV.java                        — @Entity, table: cvs
    Note.java                      — @Entity, table: notes
    ServiceNotice.java             — @Entity, table: service_notices (08-user-data)
    ServiceNoticeType.java         — enum: BANNER, MODAL (08-user-data)
    User.java                      — @Entity, table: users
    ApplicationStatus.java         — enum: SENT, IN_PROGRESS, OFFER, REJECTED
    BriefStatus.java               — enum: PENDING, READY, FAILED (v2 03-company-brief)
    ContractType.java              — enum: B2B, EMPLOYMENT, MANDATE, OTHER
    CVType.java                    — enum: FILE, LINK, NOTE
    NoteCategory.java              — enum: QUESTIONS, FEEDBACK, OTHER
    RejectionReason.java           — enum: NO_RESPONSE, EMAIL_REJECTION, REJECTED_AFTER_INTERVIEW, OTHER
    SalarySource.java              — enum: FROM_POSTING, MY_PROPOSAL
    SalaryType.java                — enum: GROSS, NET
  exception/
    GlobalExceptionHandler.java    — @RestControllerAdvice, handles validation / EntityNotFoundException (WARN log, 10-logging) / DateTimeParseException (08-user-data) / fallback (ERROR log)
  observability/
    MdcUserFilter.java             — OncePerRequestFilter; puts authenticated userId (UUID) into SLF4J MDC under key `userId` for log correlation; runs after Spring Security chain via Spring Boot auto-registration
  repository/
    ApplicationRepository.java     — JpaRepository; custom queries: findByUserId, findByIdAndUserId, existsByIdAndUserId, findByUserIdAndCompanyIgnoreCaseAndPositionIgnoreCase, getApplicationStats, clearCVReferences
    CompanyBriefRepository.java    — JpaRepository; findByUserIdAndCompanyName (the cache key) (v2 03-company-brief)
    CompanyBriefFieldRepository.java — JpaRepository; findByBriefId, deleteByBriefId (child-side access)
    CVRepository.java              — JpaRepository
    NoteRepository.java            — JpaRepository; findByApplicationIdAndApplicationUserIdOrderByCreatedAtDesc, findByIdAndApplicationUserId, etc.
    ServiceNoticeRepository.java   — JpaRepository; JPQL findActive(@Param("now") LocalDateTime now) — WHERE active=true AND (expiresAt IS NULL OR expiresAt > :now) (08-user-data)
    UserRepository.java            — JpaRepository; findByGoogleId, findByRefreshToken, findInactiveUsers(threshold) (07-privacy-rodo)
  security/
    AdminKeyFilter.java            — OncePerRequestFilter; checks X-Admin-Key header against app.admin-key; returns 403 if missing/wrong (08-user-data); logs WARN with URI + IP on every denial (10-logging)
    AuthenticatedUser.java         — record (id: UUID) — principal injected by JwtAuthenticationConverter
    CustomOAuth2UserService.java   — loads/creates user from Google OAuth2 attributes
    JwtAuthenticationConverter.java — extracts AuthenticatedUser from JWT sub claim
    JwtService.java                — generates access token (RS256, 15 min) and refresh token (UUID)
    OAuth2AuthenticationSuccessHandler.java — on OAuth2 success: issues JWT + refresh token, redirects to frontend
    TokenHasher.java               — HMAC-SHA256 util (server-side secret via `app.token.hmac-secret` / `APP_TOKEN_HMAC_SECRET`); used to hash refresh tokens before storing in DB (07-privacy-rodo, hardened to HMAC in 09-security-review)
  service/
    AccountRetentionService.java   — @Scheduled(cron daily 3:00): deletes accounts inactive > 12 months via UserService.deleteAccount; threshold from app.retention.inactive-months (07-privacy-rodo)
    ApplicationService.java        — create, findAllByUserId, findById, updateStatus, updateStage, addStage, findDuplicates, delete, update
    BriefService.java              — (v2 03-company-brief) trigger (cache-aside per company, retry only from FAILED), get, editFields, markReady, markFailed
    BriefGenerationRequested.java  — record (briefId, companyName) — the event trigger publishes (ADR-v2-002)
    BriefGenerationWorker.java     — @TransactionalEventListener(AFTER_COMMIT); hands the model call to `applicationTaskExecutor`, writes back through BriefService
    ai/
      BriefChatModel.java          — port: `GeneratedBrief generate(String companyName)` — the company name is all that leaves the system (ADR-v2-003)
      BriefLocales.java            — FIELD_KEYS (industry, product_customers, tech_stack, size_stage) + active LOCALES; one source of truth for prompt and persistence
      GeneratedBrief.java          — record (fields: List<Field{fieldKey, lang, text}>); null text = "not enough public info"
      GroqBriefChatModel.java      — active adapter, `groq/compound-mini` via the OpenAI-compatible API (ADR-v2-001)
      GeminiBriefChatModel.java    — dormant adapter, Google Search grounding; kept as the documented return path
    CVService.java                 — uploadCV, findAllByUserId, findById, downloadCV, deleteCV, createCV, updateCV, assignCVToApplication, removeCVFromApplication
    NoteService.java               — create, findByApplicationId, findById, update, delete, deleteByApplicationId, createSalaryChangeNote (⚠️ dead code — never called)
    ServiceNoticeService.java      — findActive(), create(ServiceNoticeRequest) (08-user-data)
    StatisticsService.java         — getBadgeStats: computes rejection/ghosting badges + sweet revenge unlock
    UserService.java               — findOrCreateUser (calls recordLogin), getById, getByGoogleId, saveRefreshToken (hashes token via TokenHasher), clearRefreshToken, findByValidRefreshToken (hashes + bumps lastLoginAt), acceptPrivacyPolicy, deleteAccount + createDemoApplication (new user only)
```

### All REST endpoints

**ApplicationController — `/api/applications`**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/applications` | Create application |
| `GET` | `/api/applications` | List all (current user) |
| `GET` | `/api/applications/{id}` | Get by ID |
| `PUT` | `/api/applications/{id}` | Full update |
| `DELETE` | `/api/applications/{id}` | Delete |
| `PATCH` | `/api/applications/{id}/status` | Change status (simple) |
| `PATCH` | `/api/applications/{id}/stage` | Update stage + status + rejection data |
| `POST` | `/api/applications/{id}/stage` | Add stage (sets currentStage, moves to IN_PROGRESS) |
| `PATCH` | `/api/applications/{id}/cv` | Assign or unassign CV (`{cvId: null}` removes) |
| `GET` | `/api/applications/check-duplicate` | Find duplicates by company + position |

**AuthController — `/api/auth`**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/me` | Get current user profile (requires JWT) |
| `GET` | `/api/auth/me/export` | Export all user data as JSON blob (RODO Art. 20, 08-user-data) |
| `POST` | `/api/auth/refresh` | Issue new access token from refresh token cookie |
| `POST` | `/api/auth/logout` | Clear refresh token in DB + remove cookie |
| `POST` | `/api/auth/consent` | Accept privacy policy (07-privacy-rodo) |
| `DELETE` | `/api/auth/me` | Delete user account + cascade all user data (07-privacy-rodo) |

**CVController — `/api/cv`**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cv/upload` | Upload PDF file (multipart/form-data) |
| `POST` | `/api/cv` | Create CV entry (name + type + optional URL) |
| `GET` | `/api/cv` | List all CVs (current user) |
| `GET` | `/api/cv/{id}` | Get CV by ID |
| `PUT` | `/api/cv/{id}` | Update CV entry |
| `DELETE` | `/api/cv/{id}` | Delete CV |
| `GET` | `/api/cv/{id}/download` | Download PDF (Content-Disposition: attachment) |

**NoteController — `/api`**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/applications/{applicationId}/notes` | List notes for application |
| `POST` | `/api/applications/{applicationId}/notes` | Create note |
| `GET` | `/api/notes/{id}` | Get note by ID |
| `PUT` | `/api/notes/{id}` | Update note |
| `DELETE` | `/api/notes/{id}` | Delete note |

**StatisticsController — `/api/statistics`**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/statistics/badges` | Get badge stats (rejections, ghosting, offers, badges) |

**ScreeningAnswerController — `/api/screening-answers`** (v2)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/screening-answers` | List current user's global "General" answers, ordered |
| `PUT` | `/api/screening-answers` | Replace-all save of the global set |

**ApplicationScreeningAnswerController — `/api/applications/{applicationId}/screening-answers`** (v2)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/applications/{applicationId}/screening-answers` | List "About the company" answers for one application |
| `PUT` | `/api/applications/{applicationId}/screening-answers` | Replace-all save, scoped to that application (ownership verified) |

**BriefController — `/api/applications/{applicationId}/brief`** (v2 03-company-brief)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/applications/{applicationId}/brief` | Trigger generation — 202 Accepted, body carries the status. Idempotent: `READY` returns the cached brief, `PENDING` is a no-op, only `FAILED` retries |
| `GET` | `/api/applications/{applicationId}/brief` | The company's brief — 404 when none was ever generated (the frontend reads that as "offer the generate button") |
| `PUT` | `/api/applications/{applicationId}/brief` | Save the user's own text for one or more fields; writes to the company's brief, so it shows on every application to that company |

All three resolve the application first and verify ownership before any work happens.

### Brief generation flow (v2 03-company-brief)

```
POST /brief ──► BriefService.trigger  (@Transactional)
                  ├─ requireOwnedApplication → company name
                  ├─ cache-aside on (user_id, company_name): READY → return, PENDING → no-op, FAILED → reset
                  └─ publishEvent(BriefGenerationRequested)
                                    │  AFTER_COMMIT (the PENDING row is committed first)
                                    ▼
                     BriefGenerationWorker ──► applicationTaskExecutor (off the request thread)
                                    │
                                    ├─ BriefChatModel.generate(companyName)  ──► provider (web search server side)
                                    ├─ success → BriefService.markReady   (rows replaced in one transaction)
                                    └─ any exception → BriefService.markFailed  (terminal; never a partial brief)

GET /brief ◄── the frontend polls every 2 s while the status is PENDING
```

**Trust boundary** ([ADR-v2-001](adr/ADR-v2-001-brief-provider-strategy.md)): the text
comes from web pages the provider searched, so it is **untrusted input**. The brief is
**display-only** — its content never triggers an action, a tool call, or another feature.
Anything that later wants to *act* on brief content needs a new decision.
Outbound, only the company name ever leaves the system
([ADR-v2-003](adr/ADR-v2-003-drop-job-ad-link-from-brief-prompt.md)). No annotation-driven AOP is
involved: timeouts live in the client beans, retry in Spring AI's `RetryTemplate`.

**SystemController — `/api/system`** (08-user-data)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/system/notices/active` | List active notices (public, no auth required) |

**AdminController — `/api/admin`** (08-user-data, secured by `X-Admin-Key` header via `AdminKeyFilter`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/notices` | Create a new service notice (returns 201 Created) |

**Spring Security managed**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/oauth2/authorization/google` | Start Google OAuth2 login |
| `GET` | `/actuator/health` | Health check (public) |

### Key dependencies (pom.xml)

| Artifact | Purpose |
|----------|---------|
| `spring-boot-starter-web` | REST API |
| `spring-boot-starter-data-jpa` | ORM |
| `spring-boot-starter-validation` | Bean Validation |
| `spring-boot-starter-security` | Spring Security |
| `spring-boot-starter-oauth2-client` | Google OAuth2 login |
| `spring-boot-starter-oauth2-resource-server` | JWT validation |
| `spring-boot-starter-actuator` | Health endpoint |
| `postgresql` | JDBC driver |
| `h2` | In-memory DB for tests |
| `flyway-core` + `flyway-database-postgresql` | DB migrations |
| `spring-dotenv` | `.env` file support |
| `springdoc-openapi-starter-webmvc-ui 2.8.8` | Swagger UI + OpenAPI 3 spec generation (11-swagger) |
| `spring-ai-bom 1.1.8` | Version management for the Spring AI starters (v2 03-company-brief) |
| `spring-ai-starter-model-openai` | The active brief provider — Groq via its OpenAI-compatible API (ADR-v2-001) |
| `spring-ai-starter-model-google-genai` | The dormant Gemini return path; application code only ever sees `ChatModel` |
| No Lombok | All getters/setters written manually |

---

## 2. Database — Actual Schema

### Migration history

| Version | File | Purpose |
|---------|------|---------|
| V1 | `V1__init_schema.sql` | Initial: cvs, applications, notes, stage_history tables |
| V2 | `V2__add_session_id.sql` | session_id columns (pre-auth, anonymous multi-tenant mode) |
| V3 | `V3__migrate_deprecated_statuses.sql` | ROZMOWA/ZADANIE→W_PROCESIE, ODRZUCONE→ODMOWA |
| V4 | `V4__auth_schema.sql` | users table, user_id FK on applications+cvs, drop session_id |
| V5 | `V5__rename_rejection_reasons.sql` | BRAK_ODPOWIEDZI→NO_RESPONSE etc. |
| V6 | `V6__rename_note_categories.sql` | PYTANIA→QUESTIONS, INNE→OTHER etc. |
| V7 | `V7__rename_salary_types.sql` | BRUTTO→GROSS, NETTO→NET |
| V8 | `V8__rename_contract_types.sql` | UOP→EMPLOYMENT, UZ→MANDATE, INNA→OTHER |
| V9 | `V9__rename_application_statuses.sql` | WYSLANE→SENT, W_PROCESIE→IN_PROGRESS, OFERTA→OFFER, ODMOWA→REJECTED |
| V10 | `V10__fix_column_defaults.sql` | column defaults: WYSLANE→SENT, INNE→OTHER |
| V11 | `V11__user_id_not_null.sql` | user_id NOT NULL on applications + cvs |
| V12 | `V12__drop_stage_history.sql` | DROP TABLE stage_history |
| V13 | `V13__user_privacy_policy_accepted_at.sql` | Add privacy_policy_accepted_at column (07-privacy-rodo) |
| V14 | `V14__service_notices.sql` | Create service_notices table (08-user-data) |
| V15 | `V15__user_last_login_at.sql` | Add last_login_at column to users (07-privacy-rodo) |
| V16 | `V16__add_salary_field.sql` | Add flat `salary` column to `applications` (pre-v2; distinct from the existing `salary_min`/`salary_max` range) |
| V17 | `V17__screening_answers.sql` | Create `screening_answers` table — global per-user "General" template (v2 01-screening-companion, Step 1) |
| V18 | `V18__application_company_research.sql` | Add `applications.company_research` TEXT (v2 01-screening-companion, Step 3) — **dropped in V20** |
| V19 | `V19__screening_answers_application_scope.sql` | Add nullable `screening_answers.application_id` FK — scopes rows to one application for "About the company" (v2 02-cheat-sheet-consolidation, Step 2) |
| V20 | `V20__drop_application_company_research.sql` | Drop `applications.company_research` — superseded by V19 (v2 02-cheat-sheet-consolidation, Step 2) |
| V21 | `V21__company_briefs.sql` | Create `company_briefs` + `company_brief_fields` — the AI company brief (v2 03-company-brief, Step 1) |

### Current tables

**`users`**

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| name | VARCHAR(255) | NOT NULL |
| google_id | VARCHAR(255) | NOT NULL, UNIQUE |
| refresh_token | VARCHAR(255) | nullable — stores HMAC-SHA256 hash of the token (server-side secret, 09-security-review), not plaintext |
| refresh_token_expiry | TIMESTAMP | nullable |
| created_at | TIMESTAMP | NOT NULL |
| privacy_policy_accepted_at | TIMESTAMP | nullable (07-privacy-rodo) |
| last_login_at | TIMESTAMP | nullable; updated on every login and token refresh (07-privacy-rodo) |

**`applications`**

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| company | VARCHAR(255) | NOT NULL |
| position | VARCHAR(255) | NOT NULL |
| link | VARCHAR(500) | nullable |
| salary_min | INTEGER | nullable |
| salary_max | INTEGER | nullable |
| salary | INTEGER | nullable — flat proposed salary (V16, pre-v2), distinct from the min/max range above |
| currency | VARCHAR(10) | nullable |
| salary_type | VARCHAR(50) | nullable (GROSS/NET) |
| contract_type | VARCHAR(50) | nullable (B2B/EMPLOYMENT/MANDATE/OTHER) |
| salary_source | VARCHAR(50) | nullable (FROM_POSTING/MY_PROPOSAL) |
| source | VARCHAR(255) | nullable |
| status | VARCHAR(50) | NOT NULL, default 'SENT' (SENT/IN_PROGRESS/OFFER/REJECTED) |
| job_description | TEXT | nullable |
| agency | VARCHAR(255) | nullable |
| cv_id | BIGINT | FK → cvs(id), nullable |
| applied_at | TIMESTAMP | NOT NULL |
| current_stage | VARCHAR(255) | nullable |
| rejection_reason | VARCHAR(100) | nullable (NO_RESPONSE/EMAIL_REJECTION/REJECTED_AFTER_INTERVIEW/OTHER) |
| rejection_details | TEXT | nullable |
| user_id | UUID | FK → users(id), NOT NULL |

**`cvs`**

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| type | VARCHAR(50) | default 'FILE' (FILE/LINK/NOTE) |
| file_name | VARCHAR(255) | nullable (storage filename) |
| original_file_name | VARCHAR(255) | NOT NULL (display name) |
| file_path | VARCHAR(500) | nullable |
| file_size | BIGINT | nullable |
| external_url | VARCHAR(500) | nullable |
| uploaded_at | TIMESTAMP | NOT NULL |
| user_id | UUID | FK → users(id), NOT NULL |

**`notes`**

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| content | TEXT | NOT NULL |
| application_id | BIGINT | FK → applications(id), NOT NULL, ON DELETE CASCADE |
| category | VARCHAR(255) | default 'OTHER' (QUESTIONS/FEEDBACK/OTHER) |
| created_at | TIMESTAMP | NOT NULL |

**`service_notices`** (08-user-data)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| type | VARCHAR(20) | NOT NULL (BANNER/MODAL) |
| message_pl | TEXT | NOT NULL |
| message_en | TEXT | NOT NULL |
| active | BOOLEAN | NOT NULL, default true |
| expires_at | TIMESTAMP | nullable (null = no expiry) |
| created_at | TIMESTAMP | NOT NULL |

**`stage_history`** — DROPPED (V12). Was: id, application_id FK, stage_name, completed, created_at, completed_at.

**`screening_answers`** (v2)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| user_id | UUID | FK → users(id), NOT NULL, ON DELETE CASCADE |
| application_id | BIGINT | FK → applications(id), nullable, ON DELETE CASCADE (V19) — `NULL` = global "General" row, set = "About the company" row for that application |
| question_key | VARCHAR(64) | nullable — stable key for fixed questions (e.g. `about-me`, `company-knowledge`) |
| label | VARCHAR(255) | nullable — used for custom questions |
| answer | TEXT | nullable, max 1000 chars (app-level validation) |
| custom | BOOLEAN | NOT NULL, default false |
| sort_order | INT | NOT NULL, default 0 |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | nullable |

**`company_briefs`** (v2 03-company-brief)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| user_id | UUID | FK → users(id), NOT NULL, ON DELETE CASCADE |
| company_name | VARCHAR(255) | NOT NULL |
| status | VARCHAR(16) | NOT NULL (PENDING/READY/FAILED) |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | nullable |

`UNIQUE (user_id, company_name)` — `uq_company_brief`. Serves two roles at once: the
cache key (one brief per company, reused by every application to it) and the dedup lock
behind the idempotent trigger.

**`company_brief_fields`** (v2 03-company-brief)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| brief_id | BIGINT | FK → company_briefs(id), NOT NULL, ON DELETE CASCADE |
| field_key | VARCHAR(32) | NOT NULL — industry / product_customers / tech_stack / size_stage |
| lang | VARCHAR(8) | NOT NULL — `pl`, `en`, … whatever the UI supports |
| text | TEXT | nullable — `NULL` = "not enough public info", shown as such, never guessed |
| edited | BOOLEAN | NOT NULL, default false — `true` once the user overwrote the generated text |

`UNIQUE (brief_id, field_key, lang)` — `uq_brief_field`. **Language is a row value, not a
column**: a new locale is a new `lang` value and a new field is a new `field_key`, so
neither needs a migration. `edited` separates the user's own words from derived public
data — it is exactly what makes the GDPR export honest (only `edited=true` rows are
personal data and get exported).

**`applications.company_research`** (v2) — TEXT column added V18, held the per-application
"About the company" free-text note before custom questions existed. DROPPED (V20) once
superseded by `screening_answers.application_id` (V19) — see
`spec/v2/2.0.0/as-built.md`.

### Relations

- `applications.user_id` → `users.id`
- `applications.cv_id` → `cvs.id` (nullable — application may not have a CV assigned)
- `cvs.user_id` → `users.id`
- `notes.application_id` → `applications.id` (CASCADE DELETE)
- `service_notices` — no FK relations; standalone admin-managed table
- `screening_answers.user_id` → `users.id` (CASCADE DELETE) (v2)
- `screening_answers.application_id` → `applications.id` (nullable, CASCADE DELETE) (v2)
- `company_briefs.user_id` → `users.id` (CASCADE DELETE) (v2 03-company-brief)
- `company_brief_fields.brief_id` → `company_briefs.id` (CASCADE DELETE) — deleting an
  account chains `users → company_briefs → company_brief_fields`; deleting a single
  application leaves the company's brief and its edits intact, by design

---

## 3. Frontend — Actual Architecture

### Routing (App.tsx)

| Path | Component | Protected |
|------|-----------|-----------|
| `/login` | LoginPage | No |
| `/auth/callback` | AuthCallbackPage | No |
| `/privacy` | PrivacyPolicy | No (public) — 07-privacy-rodo |
| `/dashboard` | DashboardPage → AppContent → ConsentGate | Yes (ProtectedRoute) — 07-privacy-rodo |
| `/settings` | Settings | Yes (ProtectedRoute) — 07-privacy-rodo |
| `/` | Redirect to /dashboard | — |
| `*` | Redirect to /dashboard | — |

### Views in AppContent (tab-switched, no separate routes)

| View key | Component | Description |
|----------|-----------|-------------|
| `kanban` | KanbanBoard | Drag & drop kanban |
| `list` | ApplicationTable | Sortable table with bulk delete |
| `cv` | CVManager | Upload/manage CVs, assign to applications |
| `details` | ApplicationDetails | Full application view with notes, CV, stage |
| `answers` | CheatSheet | (v2) Cheat-sheet hub — company picker + "About the company" / "General" prep; view key unchanged from 01-screening-companion Step 2, tab relabeled "Cheat sheet" in 02-cheat-sheet-consolidation Step 1 |

### Component tree

```
App.tsx
  QueryClientProvider (React Query)
  BrowserRouter
    AuthProvider           — Google OAuth2 + JWT state
      ErrorBoundary
        /login   → LoginPage
                   LanguageSwitcher (before login)
        /auth/callback → AuthCallbackPage  — exchanges code for JWT
        /privacy → PrivacyPolicy (public route, 07-privacy-rodo)
        /settings → ProtectedRoute → Settings (delete account UI, 07-privacy-rodo)
        /dashboard → ProtectedRoute → ConsentGate (07-privacy-rodo)
                                      ↓
                                    DashboardPage → AppContent
          ServiceBanner × N    — red danger banners for BANNER-type notices (08-user-data)
          ServiceModal × N     — modal popups for MODAL-type notices; dismissed per session via sessionStorage (08-user-data)
          header
            BadgeWidget        — gamification badges
            LanguageSwitcher   — PL / EN toggle
            settings-btn       — link to /settings (07-privacy-rodo)
            logout-btn         — calls POST /api/auth/logout
          TourGuide            — onboarding tour
          toolbar
            view-tabs (kanban / list / cv)
            add-btn → ApplicationForm (mode=create)
          fab                  — mobile floating action button
          main-content
            KanbanBoard
              StaleBanner    — (v2) shown when ≥1 application is stale (SENT >60 days)
              KanbanColumn × 3 (SENT / IN_PROGRESS / FINISHED)
                ApplicationCard (draggable)
                  — (v2) stale badge + one-click archive action
                  DragOverlayCard
              OnboardingOverlay
              MoveModal     — status transition confirmation
              EndModal      — OFFER / REJECTED modal (rejection reason)
              StageModal    — select/add currentStage
            ApplicationTable
            CVManager        — disabled file upload (07-privacy-rodo)
            ApplicationDetails
              CollapsibleSection × 4 — accordion: Cheat sheet / Information / Job description / Notes (v2, 02-cheat-sheet-consolidation Step 1)
                PrepReadonly   — same read-only Q&A used by the CheatSheet tab (v2)
              NotesList
            CheatSheet         — (v2) company picker + collapsible "About the company" / "General"
              CollapsibleSection × 2
                PrepReadonly
              GlobalAnswersModal      — edit "General" (v2)
              CompanyQuestionsModal   — edit "About the company" (v2)
          Footer             — privacy policy link + contact email (07-privacy-rodo)
```

### New components (07-privacy-rodo)

| Component | File | Purpose |
|-----------|------|---------|
| `ConsentGate` | `components/auth/ConsentGate.tsx` | Fullscreen overlay blocking UI for users without accepted privacy policy |
| `PrivacyPolicy` | `pages/PrivacyPolicy.tsx` | Public page rendering privacy policy in PL/EN with markdown |
| `Settings` | `pages/Settings.tsx` | Protected user settings page with account deletion and data export (08-user-data) |
| `Footer` | `components/layout/Footer.tsx` | Footer with privacy policy link and contact email |

### New components (08-user-data)

| Component | File | Purpose |
|-----------|------|---------|
| `ServiceBanner` | `components/notices/ServiceBanner.tsx` | Red danger banner for BANNER-type notices; dismissable per page load (useState) |
| `ServiceModal` | `components/notices/ServiceModal.tsx` | Modal overlay for MODAL-type notices; dismissal persisted in sessionStorage per session |
| `CountdownLabel` | `components/notices/CountdownLabel.tsx` | Inline `⏳ time left: X days X hours MM:SS` label (PL/EN); shown only when expiresAt is set |
| `useCountdown` | `components/notices/useCountdown.ts` | setInterval-based hook; returns `TimeLeft {days, hours, minutes, seconds, expired} \| null` |

### New components (v2)

| Component | File | Purpose |
|-----------|------|---------|
| `CheatSheet` | `components/cheatsheet/CheatSheet.tsx` | Cheat-sheet tab: company picker + two read-only collapsible sections + edit-modal triggers |
| `CollapsibleSection` | `components/prep/CollapsibleSection.tsx` | Accordion with icon/colour header, shared by the cheat sheet and `ApplicationDetails` |
| `PrepReadonly` | `components/prep/PrepReadonly.tsx` | `CompanyPrepReadonly` (salary + company Q&A) and `GlobalAnswersReadonly` |
| `GlobalAnswersModal` | `components/prep/GlobalAnswersModal.tsx` | Modal editor for "General" (fixed + custom questions, Save) |
| `CompanyQuestionsModal` | `components/prep/CompanyQuestionsModal.tsx` | Modal editor for "About the company" (same shape as General, per application) |
| `BriefSection` | `components/prep/BriefSection.tsx` | (03-company-brief) two exports: `GenerateBriefButton` (the ✨ header action, rendered only while the company has no brief) and `BriefFields` (generating / failed+retry / the four Q&A rows). Both read the same React Query cache, so the cheat sheet and the details page stay in step |
| `StaleBanner` | `components/kanban/StaleBanner.tsx` | Top-of-board banner counting stale (`SENT` >60 days) applications |
| `utils/stale.ts` | `utils/stale.ts` | `isStale`, `daysSince`, `STALE_THRESHOLD_DAYS`, `ARCHIVE_STALE_PAYLOAD` |
| `utils/salary.ts` | `utils/salary.ts` | `formatSalary` — shared by the cheat sheet and details |
| `components/prep/globalAnswers.ts` | — | Shared template logic: `FIXED_QUESTION_KEYS`, `FIXED_COMPANY_KEY`, `buildItems` |

### Hooks (server state via React Query)

| Hook | File | Manages |
|------|------|---------|
| `useApplications` | hooks/useApplications.ts | fetch, create, update, updateStatus, updateStage, addStage, delete, checkDuplicate |
| `useNotes` | hooks/useNotes.ts | fetch, create, update, delete notes |
| `useCV` | hooks/useCV.ts | fetch, upload, create, update, delete, assignCV |
| `useBadgeStats` | hooks/useBadgeStats.ts | fetch badge statistics |
| `useServiceNotices` | hooks/useServiceNotices.ts | fetch active notices; staleTime 5 min; returns `[]` on error (08-user-data) |
| `useScreeningAnswers` / `useSaveScreeningAnswers` | hooks/useScreeningAnswers.ts | (v2) fetch/save the global "General" set |
| `useApplicationScreeningAnswers` / `useSaveApplicationScreeningAnswers` | hooks/useScreeningAnswers.ts | (v2) fetch/save "About the company" for one application |
| `useBrief` / `useGenerateBrief` / `useEditBrief` | hooks/useBrief.ts | (v2 03-company-brief) fetch the company brief (`null` = never generated), trigger generation, save edited fields. `useBrief` polls every 2 s **only** while the status is `PENDING`; a terminal status and unmount both stop it |

### API calls (api.ts → backend endpoints)

| Function | Method | Endpoint |
|----------|--------|---------|
| `fetchCurrentUser` | GET | `/api/auth/me` |
| `logout` | POST | `/api/auth/logout` |
| `refreshToken` | POST | `/api/auth/refresh` |
| `acceptConsent` | POST | `/api/auth/consent` |
| `deleteAccount` | DELETE | `/api/auth/me` |
| `fetchApplications` | GET | `/api/applications` |
| `createApplication` | POST | `/api/applications` |
| `updateApplication` | PUT | `/api/applications/{id}` |
| `deleteApplication` | DELETE | `/api/applications/{id}` |
| `updateApplicationStatus` | PATCH | `/api/applications/{id}/status` |
| `updateApplicationStage` | PATCH | `/api/applications/{id}/stage` |
| `addStage` | POST | `/api/applications/{id}/stage` |
| `checkDuplicate` | GET | `/api/applications/check-duplicate` |
| `assignCVToApplication` | PATCH | `/api/applications/{id}/cv` |
| `fetchCVs` | GET | `/api/cv` |
| `uploadCV` | POST | `/api/cv/upload` |
| `createCV` | POST | `/api/cv` |
| `updateCV` | PUT | `/api/cv/{id}` |
| `deleteCV` | DELETE | `/api/cv/{id}` |
| `downloadCV` | GET | `/api/cv/{id}/download` |
| `fetchNotes` | GET | `/api/applications/{id}/notes` |
| `createNote` | POST | `/api/applications/{id}/notes` |
| `updateNote` | PUT | `/api/notes/{id}` |
| `deleteNote` | DELETE | `/api/notes/{id}` |
| `fetchBadgeStats` | GET | `/api/statistics/badges` |
| `fetchActiveNotices` | GET | `/api/system/notices/active` — returns `[]` on error, never breaks app (08-user-data) |
| `exportMyData` | GET | `/api/auth/me/export` — triggers blob download as `applikon-export.json` (08-user-data) |
| `fetchScreeningAnswers` | GET | `/api/screening-answers` (v2) |
| `saveScreeningAnswers` | PUT | `/api/screening-answers` (v2) |
| `fetchApplicationScreeningAnswers` | GET | `/api/applications/{id}/screening-answers` (v2) |
| `saveApplicationScreeningAnswers` | PUT | `/api/applications/{id}/screening-answers` (v2) |
| `triggerBrief` | POST | `/api/applications/{id}/brief` (v2 03-company-brief) |
| `fetchBrief` | GET | `/api/applications/{id}/brief` — maps 404 to `null`; every other non-OK status throws |
| `editBrief` | PUT | `/api/applications/{id}/brief` — sends only the fields the user changed |

### i18n

| Item | Detail |
|------|--------|
| Library | i18next + react-i18next + i18next-browser-languagedetector |
| Languages | `pl` (Polish), `en` (English), fallback: `en` |
| Detection order | localStorage → navigator |
| Namespaces | `common`, `errors`, `badges`, `tour` |
| Backend header | `Accept-Language: {i18n.language}` on every request |
| Language switcher | `LanguageSwitcher.tsx` — visible on login page and in header |

### Installed libraries (package.json)

| Library | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI |
| react-dom | ^19.2.0 | DOM rendering |
| react-router-dom | ^7.13.0 | Routing |
| @tanstack/react-query | ^5.90.21 | Server state management |
| @dnd-kit/core + sortable + utilities | ^6/^10/^3 | Drag & drop (Kanban) |
| i18next | ^25.10.10 | i18n engine |
| react-i18next | ^16.6.6 | React bindings for i18next |
| i18next-browser-languagedetector | ^8.2.1 | Detects browser language |
| tailwindcss | ^4.2.0 | CSS utility framework |
| react-markdown | ^9.* | Markdown rendering (07-privacy-rodo) |
| vite | ^7.2.4 | Build tool |
| vitest | ^1.3.0 | Unit tests |
| cypress | ^15.9.0 | E2E tests |
