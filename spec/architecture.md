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
    I18nConfig.java                — MessageSource (i18n/messages), AcceptHeaderLocaleResolver (default: en)
    OpenApiConfig.java             — @OpenAPIDefinition (title/description/version/contact) + @SecurityScheme (JWT Bearer) (phase 11)
    SecurityConfig.java            — Spring Security, OAuth2, JWT encoder/decoder, CORS
  controller/
    ApplicationController.java     — /api/applications
    AuthController.java            — /api/auth
    AdminController.java           — /api/admin (phase 08)
    CVController.java              — /api/cv
    NoteController.java            — /api (nested under /applications and /notes)
    StatisticsController.java      — /api/statistics
    SystemController.java          — /api/system (phase 08)
  dto/
    ApplicationRequest.java        — record (company, position, link, salary*, currency, salaryType, contractType, salarySource, source, jobDescription, agency)
    ApplicationResponse.java       — record (all Application fields + cv info flattened: cvId, cvFileName, cvType, cvExternalUrl)
    ApplicationStats.java          — record (rejections, ghosting, offers) — for JPQL projection
    BadgeResponse.java             — record (name, icon, description, threshold, currentCount, nextThreshold, nextBadgeName)
    BadgeStatsResponse.java        — record (rejectionBadge, ghostingBadge, sweetRevengeUnlocked, totals)
    NoteRequest.java               — record (content, category)
    NoteResponse.java              — record (id, content, category, applicationId, createdAt)
    ServiceNoticeRequest.java      — record (type, messagePl, messageEn, expiresAt) with @NotBlank @Pattern on type (phase 08)
    ServiceNoticeResponse.java     — record (id, type, messagePl, messageEn, expiresAt) (phase 08)
    StageUpdateRequest.java        — record (status, currentStage, rejectionReason, rejectionDetails)
    StatusUpdateRequest.java       — record (status)
    UserResponse.java              — record (id, email, name, privacyPolicyAcceptedAt) (phase 07)
  entity/
    Application.java               — @Entity, table: applications
    CV.java                        — @Entity, table: cvs
    Note.java                      — @Entity, table: notes
    ServiceNotice.java             — @Entity, table: service_notices (phase 08)
    ServiceNoticeType.java         — enum: BANNER, MODAL (phase 08)
    User.java                      — @Entity, table: users
    ApplicationStatus.java         — enum: SENT, IN_PROGRESS, OFFER, REJECTED
    ContractType.java              — enum: B2B, EMPLOYMENT, MANDATE, OTHER
    CVType.java                    — enum: FILE, LINK, NOTE
    NoteCategory.java              — enum: QUESTIONS, FEEDBACK, OTHER
    RejectionReason.java           — enum: NO_RESPONSE, EMAIL_REJECTION, REJECTED_AFTER_INTERVIEW, OTHER
    SalarySource.java              — enum: FROM_POSTING, MY_PROPOSAL
    SalaryType.java                — enum: GROSS, NET
  exception/
    GlobalExceptionHandler.java    — @RestControllerAdvice, handles validation / EntityNotFoundException (WARN log, phase 10) / DateTimeParseException (phase 08) / fallback (ERROR log)
  observability/
    MdcUserFilter.java             — OncePerRequestFilter; puts authenticated userId (UUID) into SLF4J MDC under key `userId` for log correlation; runs after Spring Security chain via Spring Boot auto-registration
  repository/
    ApplicationRepository.java     — JpaRepository; custom queries: findByUserId, findByIdAndUserId, existsByIdAndUserId, findByUserIdAndCompanyIgnoreCaseAndPositionIgnoreCase, getApplicationStats, clearCVReferences
    CVRepository.java              — JpaRepository
    NoteRepository.java            — JpaRepository; findByApplicationIdAndApplicationUserIdOrderByCreatedAtDesc, findByIdAndApplicationUserId, etc.
    ServiceNoticeRepository.java   — JpaRepository; JPQL findActive(@Param("now") LocalDateTime now) — WHERE active=true AND (expiresAt IS NULL OR expiresAt > :now) (phase 08)
    UserRepository.java            — JpaRepository; findByGoogleId, findByRefreshToken, findInactiveUsers(threshold) (phase 07)
  security/
    AdminKeyFilter.java            — OncePerRequestFilter; checks X-Admin-Key header against app.admin-key; returns 403 if missing/wrong (phase 08); logs WARN with URI + IP on every denial (phase 10)
    AuthenticatedUser.java         — record (id: UUID) — principal injected by JwtAuthenticationConverter
    CustomOAuth2UserService.java   — loads/creates user from Google OAuth2 attributes
    JwtAuthenticationConverter.java — extracts AuthenticatedUser from JWT sub claim
    JwtService.java                — generates access token (RS256, 15 min) and refresh token (UUID)
    OAuth2AuthenticationSuccessHandler.java — on OAuth2 success: issues JWT + refresh token, redirects to frontend
    TokenHasher.java               — HMAC-SHA256 util (server-side secret via `app.token.hmac-secret` / `APP_TOKEN_HMAC_SECRET`); used to hash refresh tokens before storing in DB (phase 07, hardened to HMAC in phase 09)
  service/
    AccountRetentionService.java   — @Scheduled(cron daily 3:00): deletes accounts inactive > 12 months via UserService.deleteAccount; threshold from app.retention.inactive-months (phase 07)
    ApplicationService.java        — create, findAllByUserId, findById, updateStatus, updateStage, addStage, findDuplicates, delete, update
    CVService.java                 — uploadCV, findAllByUserId, findById, downloadCV, deleteCV, createCV, updateCV, assignCVToApplication, removeCVFromApplication
    NoteService.java               — create, findByApplicationId, findById, update, delete, deleteByApplicationId, createSalaryChangeNote (⚠️ dead code — never called)
    ServiceNoticeService.java      — findActive(), create(ServiceNoticeRequest) (phase 08)
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
| `GET` | `/api/auth/me/export` | Export all user data as JSON blob (RODO Art. 20, phase 08) |
| `POST` | `/api/auth/refresh` | Issue new access token from refresh token cookie |
| `POST` | `/api/auth/logout` | Clear refresh token in DB + remove cookie |
| `POST` | `/api/auth/consent` | Accept privacy policy (phase 07) |
| `DELETE` | `/api/auth/me` | Delete user account + cascade all user data (phase 07) |

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

**SystemController — `/api/system`** (phase 08)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/system/notices/active` | List active notices (public, no auth required) |

**AdminController — `/api/admin`** (phase 08, secured by `X-Admin-Key` header via `AdminKeyFilter`)

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
| `springdoc-openapi-starter-webmvc-ui 2.8.8` | Swagger UI + OpenAPI 3 spec generation (phase 11) |
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
| V13 | `V13__user_privacy_policy_accepted_at.sql` | Add privacy_policy_accepted_at column (phase 07) |
| V14 | `V14__service_notices.sql` | Create service_notices table (phase 08) |
| V15 | `V15__user_last_login_at.sql` | Add last_login_at column to users (phase 07) |
| V16 | `V16__add_salary_field.sql` | Add flat `salary` column to `applications` (pre-v2; distinct from the existing `salary_min`/`salary_max` range) |
| V17 | `V17__screening_answers.sql` | Create `screening_answers` table — global per-user "General" template (v2 Phase 1) |
| V18 | `V18__application_company_research.sql` | Add `applications.company_research` TEXT (v2 Phase 3) — **dropped in V20** |
| V19 | `V19__screening_answers_application_scope.sql` | Add nullable `screening_answers.application_id` FK — scopes rows to one application for "About the company" (v2 Phase 6) |
| V20 | `V20__drop_application_company_research.sql` | Drop `applications.company_research` — superseded by V19 (v2 Phase 6) |

### Current tables

**`users`**

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| name | VARCHAR(255) | NOT NULL |
| google_id | VARCHAR(255) | NOT NULL, UNIQUE |
| refresh_token | VARCHAR(255) | nullable — stores HMAC-SHA256 hash of the token (server-side secret, phase 09), not plaintext |
| refresh_token_expiry | TIMESTAMP | nullable |
| created_at | TIMESTAMP | NOT NULL |
| privacy_policy_accepted_at | TIMESTAMP | nullable (phase 07) |
| last_login_at | TIMESTAMP | nullable; updated on every login and token refresh (phase 07) |

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

**`service_notices`** (phase 08)

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

**`applications.company_research`** (v2) — TEXT column added V18, held the per-application
"About the company" free-text note before custom questions existed. DROPPED (V20) once
superseded by `screening_answers.application_id` (V19) — see
`spec/v2/as-built.md` §2.

### Relations

- `applications.user_id` → `users.id`
- `applications.cv_id` → `cvs.id` (nullable — application may not have a CV assigned)
- `cvs.user_id` → `users.id`
- `notes.application_id` → `applications.id` (CASCADE DELETE)
- `service_notices` — no FK relations; standalone admin-managed table
- `screening_answers.user_id` → `users.id` (CASCADE DELETE) (v2)
- `screening_answers.application_id` → `applications.id` (nullable, CASCADE DELETE) (v2)

---

## 3. Frontend — Actual Architecture

### Routing (App.tsx)

| Path | Component | Protected |
|------|-----------|-----------|
| `/login` | LoginPage | No |
| `/auth/callback` | AuthCallbackPage | No |
| `/privacy` | PrivacyPolicy | No (public) — phase 07 |
| `/dashboard` | DashboardPage → AppContent → ConsentGate | Yes (ProtectedRoute) — phase 07 |
| `/settings` | Settings | Yes (ProtectedRoute) — phase 07 |
| `/` | Redirect to /dashboard | — |
| `*` | Redirect to /dashboard | — |

### Views in AppContent (tab-switched, no separate routes)

| View key | Component | Description |
|----------|-----------|-------------|
| `kanban` | KanbanBoard | Drag & drop kanban |
| `list` | ApplicationTable | Sortable table with bulk delete |
| `cv` | CVManager | Upload/manage CVs, assign to applications |
| `details` | ApplicationDetails | Full application view with notes, CV, stage |
| `answers` | CheatSheet | (v2) Cheat-sheet hub — company picker + "About the company" / "General" prep; view key unchanged from Phase 2, tab relabeled "Cheat sheet" in Phase 5 |

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
        /privacy → PrivacyPolicy (public route, phase 07)
        /settings → ProtectedRoute → Settings (delete account UI, phase 07)
        /dashboard → ProtectedRoute → ConsentGate (phase 07)
                                      ↓
                                    DashboardPage → AppContent
          ServiceBanner × N    — red danger banners for BANNER-type notices (phase 08)
          ServiceModal × N     — modal popups for MODAL-type notices; dismissed per session via sessionStorage (phase 08)
          header
            BadgeWidget        — gamification badges
            LanguageSwitcher   — PL / EN toggle
            settings-btn       — link to /settings (phase 07)
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
            CVManager        — disabled file upload (phase 07)
            ApplicationDetails
              CollapsibleSection × 4 — accordion: Cheat sheet / Information / Job description / Notes (v2, Phase 5)
                PrepReadonly   — same read-only Q&A used by the CheatSheet tab (v2)
              NotesList
            CheatSheet         — (v2) company picker + collapsible "About the company" / "General"
              CollapsibleSection × 2
                PrepReadonly
              GlobalAnswersModal      — edit "General" (v2)
              CompanyQuestionsModal   — edit "About the company" (v2)
          Footer             — privacy policy link + contact email (phase 07)
```

### New components (phase 07)

| Component | File | Purpose |
|-----------|------|---------|
| `ConsentGate` | `components/auth/ConsentGate.tsx` | Fullscreen overlay blocking UI for users without accepted privacy policy |
| `PrivacyPolicy` | `pages/PrivacyPolicy.tsx` | Public page rendering privacy policy in PL/EN with markdown |
| `Settings` | `pages/Settings.tsx` | Protected user settings page with account deletion and data export (phase 08) |
| `Footer` | `components/layout/Footer.tsx` | Footer with privacy policy link and contact email |

### New components (phase 08)

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
| `useServiceNotices` | hooks/useServiceNotices.ts | fetch active notices; staleTime 5 min; returns `[]` on error (phase 08) |
| `useScreeningAnswers` / `useSaveScreeningAnswers` | hooks/useScreeningAnswers.ts | (v2) fetch/save the global "General" set |
| `useApplicationScreeningAnswers` / `useSaveApplicationScreeningAnswers` | hooks/useScreeningAnswers.ts | (v2) fetch/save "About the company" for one application |

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
| `fetchActiveNotices` | GET | `/api/system/notices/active` — returns `[]` on error, never breaks app (phase 08) |
| `exportMyData` | GET | `/api/auth/me/export` — triggers blob download as `applikon-export.json` (phase 08) |
| `fetchScreeningAnswers` | GET | `/api/screening-answers` (v2) |
| `saveScreeningAnswers` | PUT | `/api/screening-answers` (v2) |
| `fetchApplicationScreeningAnswers` | GET | `/api/applications/{id}/screening-answers` (v2) |
| `saveApplicationScreeningAnswers` | PUT | `/api/applications/{id}/screening-answers` (v2) |

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
| react-markdown | ^9.* | Markdown rendering (phase 07) |
| vite | ^7.2.4 | Build tool |
| vitest | ^1.3.0 | Unit tests |
| cypress | ^15.9.0 | E2E tests |
