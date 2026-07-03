# Applikon v1 — As-Built Documentation

> Generated: 2026-04-23. Describes the actual implemented state of Applikon v1 (ex. EasyApply)
> Source of truth: the code. This document reflects what exists, not what was planned.
>
> **Architecture reference** (package structure, REST endpoints, DB schema, FE components) is `spec/architecture.md` — moved out of `spec/v1/` since it now also covers v2's additions.
>
> **Latest update:** Post-v1 security cleanup (2026-05-08): `MdcUserFilter` moved to `observability/`, `ConsentRequiredFilter` migrated to `@Component`, dead code removed in `ConsentRequiredFilter`. No behaviour change. See section 10.

---

## 1. Summary — Plan vs Reality

| Area | Planned | Built | Status |
|------|---------|-------|--------|
| Application CRUD | Basic REST API | Full CRUD + stage + duplicate check | As planned + more |
| Kanban view | 5 statuses (SENT/IN_PROGRESS/OFFER/REJECTED and one more) | 4 DB statuses (SENT/IN_PROGRESS/OFFER/REJECTED), 3 Kanban columns (SENT/IN_PROGRESS/FINISHED) | Different |
| CV management | PDF upload + LINK + NOTE types, assign to application (PHASE 4) | LINK + NOTE implemented; FILE upload disabled (phase 07) | Modified |
| Notes | Plaintext with QUESTIONS/FEEDBACK/OTHER categories (PHASE 5) | Implemented, categories renamed to English | As planned |
| Authentication | Not in MVP (planned for future) | Fully implemented: Google OAuth2 + JWT + refresh tokens | Added beyond spec |
| Stage history (StageHistory entity) | Planned in mvp-implementation-plan.md | Implemented, then removed (V12) — overengineered | Removed |
| i18n (EN/PL) | Not in brief | Fully implemented: i18next, LanguageDetector, switcher, all strings translated | Added beyond spec |
| Badges / gamification | In plan (PHASE 7) | StatisticsService + BadgeWidget (rejection/ghosting badges, sweet revenge) | As planned |
| Responsiveness / mobile | Implicit in brief (vs Teal: "brak wersji mobilnej") | FAB, MoveModal as mobile bottom sheet, isMobile(), OnboardingOverlay | As planned |
| Onboarding / Tour | Not in plan | OnboardingOverlay, TourGuide components | Added beyond spec |
| Enum values | Polish (WYSLANE, BRUTTO, UOP, BRAK_ODPOWIEDZI) | English (SENT, GROSS, EMPLOYMENT, NO_RESPONSE) | Different (renamed) |
| Salary change auto-note | Planned in i18n impl. plan | `createSalaryChangeNote()` defined in NoteService — never called from ApplicationService | Dead code |
| Duplicate detection | Planned (check-duplicate) | Implemented | As planned |
| Job description archive | Planned (jobDescription field) | Implemented | As planned |
| Re-application warning | Planned | Implemented via check-duplicate | As planned |
| Hidden recruitment (agency) | Planned | Implemented (agency field) | As planned |
| Security: CORS | Planned (separate CorsConfig) | Merged into SecurityConfig | Different |
| Database migrations | Not planned (ddl-auto=update) | Flyway migrations V1–V13 | Added beyond spec |
| Privacy policy (phase 07) | Not in MVP | `/privacy` page public route, PL/EN, react-markdown | Added (phase 07) |
| Consent flow (phase 07) | Not in MVP | ConsentGate wrapper, POST /api/auth/consent, blocks UI until accepted | Added (phase 07) |
| Account deletion (phase 07) | Not in MVP | DELETE /api/auth/me + cascade; /settings page with deletion UI | Added (phase 07) |
| Retention & hygiene (phase 07) | Not in MVP | last_login_at tracking; daily cron removes inactive accounts >12 months; refresh_token stored as HMAC-SHA256 hash (hardened from plain SHA-256 in phase 09); PII removed from logs | Added (phase 07) |
| Data export (phase 08) | Not in MVP | GET /api/auth/me/export returns JSON blob with all user data (RODO Art. 20) | Added (phase 08) |
| Service notices (phase 08) | Not in MVP | BANNER/MODAL notices via DB; admin POST endpoint secured by X-Admin-Key header; countdown timer | Added (phase 08) |
| API documentation (phase 11) | Not in MVP | Swagger UI at /swagger-ui.html; OpenAPI 3 spec auto-generated; JWT Bearer auth scheme; all controllers tagged | Added (phase 11) |
| Landing page (phase 15) | Not in MVP | Public `/` route renders `LandingPage` component; unauthenticated users see landing, authenticated users redirect to `/dashboard`; static Kanban preview mock; rotating job portal animation; i18n PL/EN; mobile responsive | Added (phase 15) |

---

## 2. Features — Status

Based on `spec/v1/01-vision/brief.md`:

### MVP Features (§4)

| Feature | Status | Notes |
|---------|--------|-------|
| Application registry (CRUD): company, position, link, date, salary, currency, status, source | ✅ Implemented | Plus: salaryMin/salaryMax, contractType, salaryType, salarySource, agency, jobDescription |
| Kanban view: drag & drop between columns | ✅ Implemented | 3 columns (SENT, IN_PROGRESS, FINISHED) — not 5 as in brief |
| CV management: PDF upload (max 5MB) + LINK + NOTE types, assign to application | ✅ Implemented | As planned in PHASE 4; categories renamed to English |
| Notepad: plaintext, multiple per application, with categories (QUESTIONS/FEEDBACK/OTHER) | ✅ Implemented | As planned in PHASE 5; categories renamed to English |

### Edge Cases (§5)

| Edge Case | Status | Notes |
|-----------|--------|-------|
| Re-application notification | ✅ Implemented | `GET /api/applications/check-duplicate` |
| Hidden recruitment (agency field) | ✅ Implemented | `agency` field on Application entity |
| Expired links (job description archive) | ✅ Implemented | `jobDescription TEXT` column |
| Salary negotiation history | ❌ Not implemented | `createSalaryChangeNote()` exists in NoteService but is never called from ApplicationService — dead code, no user-visible effect |
| Multi-currency (PLN/EUR/USD/GBP) | ✅ Implemented | `currency` field, no auto-conversion |
| Duplicate detection | ✅ Implemented | Case-insensitive match on company + position |

---

## 3. Deviations from Plan

### 6a. Enum names renamed to English (all)

The original plan and brief used Polish enum values. All were renamed to English via Flyway migrations V5–V9:

| Enum | Plan (Polish) | Reality (English) |
|------|--------------|-------------------|
| ApplicationStatus | WYSLANE, W_PROCESIE, OFERTA, ODMOWA | SENT, IN_PROGRESS, OFFER, REJECTED |
| ContractType | B2B, UOP, UZ, INNA | B2B, EMPLOYMENT, MANDATE, OTHER |
| SalaryType | BRUTTO, NETTO | GROSS, NET |
| RejectionReason | BRAK_ODPOWIEDZI, ODMOWA_MAILOWA, ODRZUCENIE_PO_ROZMOWIE, INNE | NO_RESPONSE, EMAIL_REJECTION, REJECTED_AFTER_INTERVIEW, OTHER |
| NoteCategory | PYTANIA (legacy), INNE (legacy) | QUESTIONS, FEEDBACK, OTHER |

### 6b. Kanban columns: 5 statuses → 4 DB statuses + 3 columns

Brief planned 5 columns: *Wysłane → Rozmowa → Zadanie → Oferta → Odrzucone*.

Reality:
- 4 database statuses: SENT, IN_PROGRESS, OFFER, REJECTED
- 3 Kanban columns: SENT | IN_PROGRESS | FINISHED (FINISHED groups both OFFER and REJECTED)
- V3 migration evidence: ROZMOWA and ZADANIE were merged into W_PROCESIE (later renamed IN_PROGRESS)

### 6c. StageHistory: planned, implemented, removed

The `mvp-implementation-plan.md` included a `StageHistory` entity, `StageHistoryRepository`, `StageHistoryResponse` DTO, `@OneToMany` relation, and dedicated service methods.

All of this was implemented, then removed in a cleanup refactoring:
- `entity/StageHistory.java` — deleted
- `repository/StageHistoryRepository.java` — deleted
- `dto/StageHistoryResponse.java` — deleted
- `ApplicationRepository.findByUserIdWithStageHistory` — replaced with `findByUserId`
- V12 Flyway migration drops the `stage_history` table

Reason: The UI never displayed stage history. Data was collected but never consumed. Removing eliminated dead complexity.

### 6d. CORS: separate class → merged into SecurityConfig

Plan: create a separate `CorsConfig.java` class with `WebMvcConfigurer`.

Reality: CORS is configured as a `CorsConfigurationSource` bean inside `SecurityConfig.java`. This is architecturally correct — Spring Security must handle CORS before auth checks, so it must be inside the security filter chain.

### 6e. JPA ddl-auto: update → validate + Flyway

Plan: `spring.jpa.hibernate.ddl-auto=update` (Hibernate manages schema).

Reality: `spring.jpa.hibernate.ddl-auto=validate` + Flyway migrations. Flyway manages all schema changes via versioned SQL files (V1–V12). Hibernate only validates the schema matches the entities on startup.

### 6f. ApplicationResponse: no stageHistory field

Plan included `List<StageHistoryResponse> stageHistory` in `ApplicationResponse`.

Reality: `ApplicationResponse` record has no `stageHistory` field. `domain.ts` on the frontend has no `stageHistory` field in the `Application` interface. Both cleaned up alongside V12.

### 6g. Salary change auto-note: dead code

The i18n implementation plan describes `service/NoteService.java` — auto-note salary change i18n.  
`NoteService.createSalaryChangeNote()` was implemented with i18n support.  
However, `ApplicationService.update()` does **not** call it — no salary change comparison logic, no note creation on update.  
The method exists and is reachable from the `NoteController` tests, but is never triggered in the application flow.

### 6h. ApplicationRequest does not send status

`ApplicationRequest` (POST + PUT body) has no `status` field. Status is always set to `SENT` on creation and can only be changed via dedicated PATCH endpoints. This is an intentional architectural decision (not a deviation from spec).

---

## 4. Added Beyond Spec

The following features are implemented but were **not** in `brief.md` or `mvp-implementation-plan.md`.

> Note: Gamification (PHASE 7), CVType FILE/LINK/NOTE (PHASE 4), NoteCategory (PHASE 5), and SalarySource (architecture section) are all in `mvp-implementation-plan.md` and are therefore **not** listed here.

### 7a. Authentication: Google OAuth2 + JWT

`brief.md §8` listed auth as future work (Spring Security + OAuth2 + session-based). The MVP plan had no auth etap. Implemented in full:
- Google OAuth2 login (`/oauth2/authorization/google`)
- JWT access token (RS256, 15-minute expiry, in-memory RSA key pair)
- Refresh token (opaque UUID, 7-day expiry, stored in `users.refresh_token`, sent as httpOnly cookie)
- `AuthController`: `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`
- `JwtService`, `JwtAuthenticationConverter`, `CustomOAuth2UserService`, `OAuth2AuthenticationSuccessHandler`, `MdcUserFilter`
- Multi-user isolation: every query filters by `user_id` from JWT

### 7b. Onboarding / Tour

Not in brief or implementation plan:
- `OnboardingOverlay.tsx` — shown in KanbanBoard on first visit
- `TourGuide.tsx` — step-by-step interactive guide
- i18n namespace `tour` with tour step translations

### 7c. i18n (internationalization, EN/PL)

Not in brief or MVP implementation plan (documented as a separate additional feature in `spec/v1/05-additional-features/i18n/`):
- i18next with 4 namespaces: `common`, `errors`, `badges`, `tour`
- Language auto-detection from localStorage or browser (navigator)
- `LanguageSwitcher.tsx` — PL/EN toggle, visible on login page and in header
- `Accept-Language` header sent with every API request
- Backend: `I18nConfig.java` with `MessageSource` (i18n/messages.properties + messages_pl.properties) and `AcceptHeaderLocaleResolver`
- All validation messages and error messages i18n-aware

### 7d. Demo application for new users

`UserService.createDemoApplication()` — called automatically on first login. Creates a sample "Google / Junior Software Engineer" application with job description text.

### 7e. React Query (@tanstack/react-query)

Brief specified `fetch API` for HTTP communication. Reality uses React Query v5 for full server-state management: caching, invalidation, optimistic updates, loading/error states.

### 7f. Cypress E2E tests

Not in spec. The project includes Cypress for end-to-end testing (`cypress/e2e/`). Components use `data-cy` attributes for test selectors.

### 7g. Logout button

Documented as a separate additional feature (`spec/v1/05-additional-features/logout/`). Frontend `signOut()` calls `POST /api/auth/logout` before clearing localStorage.

---

## 5. Phase 07 — Privacy & RODO (2026-04-23)

**Status:** rodo-minimum + cv-link-only **complete**. retention-hygiene deferred post-publication.

### 8a. rodo-minimum — Consent & Account Deletion

**Backend:**
- `User.privacyPolicyAcceptedAt` field (nullable TIMESTAMP)
- `POST /api/auth/consent` — accept privacy policy (idempotent, returns 204)
- `DELETE /api/auth/me` — delete user account + cascade (applications, notes, CVs, files)
- `ConsentRequiredFilter` — guard protecting all endpoints except whitelist (consent, logout, refresh, delete)
- Flyway V13: add `privacy_policy_accepted_at` column
- Tests: 4 new + updated existing for consent/delete flow

**Frontend:**
- `PrivacyPolicy.tsx` — public route `/privacy`, renders markdown policy PL/EN with react-markdown
- `ConsentGate.tsx` — fullscreen overlay blocking UI for users without accepted policy
- `Settings.tsx` — protected route `/settings`, email + accept date display, delete account modal with confirmation
- `Footer.tsx` — visible on all pages, links to `/privacy` + mailto contact
- i18n: 8+ keys for consent (title, description, button, etc.) + 12+ for settings (delete flow)
- Tests: 21 new tests (PrivacyPolicy, ConsentGate, Settings)

### 8b. cv-link-only — Disable File Upload

**Backend:**
- `POST /api/cv/upload` returns **503 Service Unavailable** with message "File upload is temporarily unavailable. Use CV link instead."

**Frontend:**
- CVManager: upload card disabled (opacity 0.5, cursor not-allowed, aria-disabled=true)
- Icon changed from 📁 to 🔒
- Tooltip: "Chwilowo nieczynne" (PL) / "Temporarily unavailable" (EN)
- Link option fully functional

**Rationale:** CV files contain PII (address, phone, birthdate, photo, employment history). Hosting them on our infrastructure creates RODO liability. User provides link (Google Drive, Dropbox, own site) — user manages access, we keep only the link.

### 8c. retention-hygiene (deferred)

**Planned (not yet implemented):**
- `lastLoginAt` field tracking user activity
- Scheduled job (daily 3:00 AM) deleting accounts inactive > 12 months
- Refresh token hashing (SHA-256) — store hash, not plaintext
- Audit: verify logs don't leak email/name/tokens
- Spec exists in `v1/07-privacy-rodo/retention-hygiene/implementation-plan-backend.md`

**Why deferred:** Compliance with minimum RODO is now met. retention-hygiene improves infrastructure security & data minimization but is not blocking publication. Will implement post-MVP launch.

---

## 6. Phase 08 — User Data & Service Notices (2026-04-27)

**Status:** data-export + service-notices **complete**.

### 9a. Data Export (RODO Art. 20)

**Backend:**
- `GET /api/auth/me/export` in `AuthController` — returns JSON with all user data: profile, all applications (with notes and CV info)
- Response sent as `Content-Disposition: attachment; filename="applikon-export.json"` with `Content-Type: application/json`

**Frontend:**
- Settings page: export section above danger zone — title, description, "Export data" button
- `exportMyData()` in `api.ts` — fetches the blob and triggers browser download
- i18n keys: `settings.exportTitle/Description/Button/exporting/exportError` (PL + EN)

### 9b. Service Notices System

**Backend:**
- `ServiceNotice` entity: id, type (BANNER/MODAL), messagePl, messageEn, active, expiresAt (nullable), createdAt
- `ServiceNoticeRepository.findActive()` — JPQL query filtering `active=true AND (expiresAt IS NULL OR expiresAt > :now)`
- `GET /api/system/notices/active` — public endpoint, no auth required; returns list of active notices
- `POST /api/admin/notices` — creates new notice; secured by `AdminKeyFilter` (X-Admin-Key header); returns 201 Created
- `AdminKeyFilter` — `OncePerRequestFilter`; reads `${app.admin-key}` from properties; returns 403 if header missing or value wrong
- `SecurityConfig`: `/api/admin/**` added to `permitAll()` (Spring Security skips JWT check; filter handles auth); `X-Admin-Key` added to CORS `allowedHeaders`
- `GlobalExceptionHandler`: added `DateTimeParseException` handler → 400 with ISO-8601 format error message
- Flyway V14: `service_notices` table
- Tests: `SystemControllerTest` (3 tests: empty list, active notice, expired excluded) + `AdminControllerTest` (4 tests: valid key→201, no key→403, wrong key→403, invalid body→400)

**Frontend:**
- `useServiceNotices` hook (React Query, staleTime 5 min) — fetches `/api/system/notices/active`; returns `[]` on any error so the app never breaks
- `ServiceBanner` — dismissable red danger banner (background `#dc3545`); state in `useState`, resets on page reload
- `ServiceModal` — modal overlay; dismissal stored in `sessionStorage` key `dismissed_notices` (array of IDs); reappears after logout because `AuthProvider.signOut()` calls `sessionStorage.removeItem('dismissed_notices')`
- `CountdownLabel` — shown when `expiresAt` is set and not expired; displays `⏳ time left: X days X hours MM:SS` (PL) or `⏳ time left: ...` (EN)
- `useCountdown` — setInterval-based hook (1s tick); exports `TimeLeft` interface
- `AppContent` — renders banners above header and modals above TourGuide
- `notices.css` — red danger theme: bold white text on `#dc3545` background with `border-bottom: 3px solid #a71d2a`
- i18n key: `notices.ok: "OK, I understand"` / `"OK, I understand"` (PL + EN)
- Tests: `ServiceBanner.test.tsx` (4 tests) + `ServiceModal.test.tsx` (4 tests, uses `sessionStorage.clear()`)

---

## 7. Phase 10 — Logging (2026-05-06)

**Status:** complete.

Added targeted `WARN`-level logging to three previously invisible failure paths; removed two unused `Logger` field declarations.

### What changed

**`AdminKeyFilter`** — logs every blocked admin request before returning 403:
```
WARN  [anonymous] c.e.s.AdminKeyFilter - Admin access denied: uri=/api/admin/users, ip=1.2.3.4
```

**`AuthController.refresh()`** — logs failed token refresh inside the existing catch block:
```
WARN  [anonymous] c.e.c.AuthController - Token refresh failed: Refresh token not found or expired
```

**`GlobalExceptionHandler.handleEntityNotFoundException()`** — logs every 404 before returning ProblemDetail:
```
WARN  [userId=abc123] c.e.e.GlobalExceptionHandler - Entity not found: Application with id=999 not found
```

**`NoteService`**, **`JwtService`** — removed unused `Logger` field + `slf4j` imports (dead code).

### Design notes

- All new logs are `WARN` — security denials and token failures are unexpected in normal operation; 404 is visible in production without being an error.
- IP address logged in `AdminKeyFilter` (remote IP is security-relevant); elsewhere MDC already carries `userId` via `MdcUserFilter`.
- Logger style kept consistent: explicit `LoggerFactory.getLogger` (no `@Slf4j`), matching `UserService`, `ApplicationService` etc.

---

## 8. Phase 11 — Swagger / OpenAPI (2026-05-06)

**Status:** complete.

Added `springdoc-openapi-starter-webmvc-ui 2.8.8`. OpenAPI 3 spec is auto-generated from existing annotations; no manual spec files.

### What changed

**`pom.xml`** — added `springdoc-openapi-starter-webmvc-ui 2.8.8` dependency.

**`application.properties`** — added springdoc config:
```properties
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.api-docs.path=/v3/api-docs
springdoc.swagger-ui.operations-sorter=alpha
springdoc.swagger-ui.tags-sorter=alpha
```

**`SecurityConfig.java`:**
- `/swagger-ui/**`, `/swagger-ui.html`, `/v3/api-docs/**` added to `permitAll()` block
- CSP relaxed from `default-src 'self'` to `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:` — required for Swagger UI inline scripts/styles

**`config/OpenApiConfig.java`** (new file):
- `@OpenAPIDefinition` — title "Applikon API", description, version 1.0.0, contact (Jakub Bone)
- `@SecurityRequirement(name = "bearerAuth")` — global: all endpoints show padlock in Swagger UI
- `@SecurityScheme` — HTTP Bearer JWT; adds "Authorize" button to the UI

**Controllers — `@Tag` added to all:**

| Controller | Tag name | Description |
|-----------|----------|-------------|
| `ApplicationController` | Applications | CRUD and duplicate detection for job applications |
| `AuthController` | Auth | Google OAuth2 login, JWT refresh, consent, account management |
| `AdminController` | Admin | Service notices management — requires X-Admin-Key header |
| `CVController` | CV | CV versions — link and note types |
| `NoteController` | Notes | Notes per application — Questions, Feedback, Other |
| `StatisticsController` | Statistics | Badge stats and application metrics |
| `SystemController` | System | Active service notices shown to logged-in users |

**`@Operation` added to non-obvious endpoints:**

| Endpoint | Summary |
|----------|---------|
| `POST /api/auth/refresh` | Refresh access token using a valid refresh token |
| `POST /api/auth/consent` | Record user consent (required once after first login) |
| `DELETE /api/auth/me` | Permanently delete the authenticated user's account and all their data |
| `GET /api/auth/me/export` | Export all user data as JSON (RODO Art. 20) |
| `POST /api/admin/notices` | Create a service notice (BANNER or MODAL) |

### Accessible at

| URL | Content |
|-----|---------|
| `/swagger-ui.html` | Swagger UI (browser) |
| `/v3/api-docs` | Raw OpenAPI 3 JSON spec |

---

## 9. Phase 12 — GitHub Actions CI (2026-05-06)

Two parallel jobs triggered on every push to `master`.

| Job | Steps |
|-----|-------|
| Backend | `actions/setup-java@v4` (Java 21 Temurin) → `./mvnw test` |
| Frontend | `actions/setup-node@v4` (Node 22) → `npm ci` → `npm run test:run` → `npm run build` |

CI badge added to `README.md`. No caching, no artifact publishing — tests are the only signal.

Note: `applikon-backend/mvnw` required `chmod +x` in the git index (`100644` → `100755`) to run on Linux runners.

---

## 10. Post-v1 — Security cleanup (2026-05-08)

Follow-up to `spec/post/security-review.md`. Cleanup-only — no behaviour change, all 108 tests pass.

### What changed

- **`MdcUserFilter` moved** from `security/` to `observability/`. Filter is purely diagnostic (puts `userId` into MDC for log correlation); semantically does not belong in `security/`. Package change only — no logic touched.
- **`ConsentRequiredFilter` migrated to `@Component`** with constructor injection. Previously created manually as a `@Bean` in `SecurityConfig`. Removed the corresponding `@Bean` method and the now-unused `userRepository` / `ObjectMapper` fields from `SecurityConfig`. Filter style is now consistent across all three custom filters (`AdminKeyFilter`, `ConsentRequiredFilter`, `MdcUserFilter` — all `@Component`).
- **Dead code removed in `ConsentRequiredFilter`**: redundant whitelist branch (`/api/auth/me` was already covered earlier in `isWhitelisted()`) and the unused `method` local variable.

### Discussed and intentionally skipped

- **Whitelist of public paths in two places** (`SecurityConfig.permitAll()` and `ConsentRequiredFilter.isWhitelisted()`) — left inline. Locality of the rule next to the filter that uses it was judged more useful than DRY for two short lists.
- **Correlation ID** — not added. Overengineering for current scope; MDC carries `userId` which is enough for v1.

### Files touched

| File | Change |
|------|--------|
| `observability/MdcUserFilter.java` | New location (moved from `security/MdcUserFilter.java`) |
| `security/ConsentRequiredFilter.java` | Added `@Component`; removed dead whitelist branch + unused `method` local |
| `config/SecurityConfig.java` | Removed `@Bean ConsentRequiredFilter` method; removed `userRepository` and `ObjectMapper` fields |

---

## 11. Phase 14 — Brand Rename to Applikon (2026-05-10)

**Status:** complete.

The project was renamed from `EasyApply` to `Applikon` to avoid conflict with
LinkedIn's "Easy Apply" feature and `applicotrack.com`. Polish identity
"Aplikuj bez spiny" stays on the `aplikujbezspiny.pl` domain.

### What changed

- **Backend:** module folder `easyapply-backend` → `applikon-backend`; Java
  package `com.easyapply.*` → `com.applikon.*`; main class
  `EasyApplyApplication` → `ApplikonApplication`; `pom.xml` (artifactId, name,
  description); `application.properties` (`spring.application.name`);
  OpenAPI title; JWT issuer (`easyapply` → `applikon`); JWK keyID;
  download filename in `AuthController` (`applikon-export.json`).
  **Note:** `V1__init_schema.sql` was deliberately left untouched — Flyway
  checksums the full file content (including comments), so editing an
  already-applied migration breaks startup with a checksum mismatch.
- **Frontend:** module folder `easyapply-frontend` → `applikon-frontend`;
  `package.json` and `package-lock.json` (`name`); `index.html` (title, OG
  meta, description); logo `alt` attributes; localStorage token key
  (`easyapply_token` → `applikon_token`); export download filename;
  i18n bundles (`pl/en common.json`, `pl/en tour.json`); privacy policy
  (PL + EN); test assertions; Cypress support.
- **Infra:** `docker-compose.yml` services and network; `.env.example`;
  `.github/workflows/ci.yml` (working-dirs, GHCR image tags);
  `.claude/commands/mentor-refactor-{backend,frontend}.md`;
  `.claude/skills/code-review-backend/references/java-conventions.md`.
- **Docs:** `README.md` (title, tagline, screenshot alt, GHCR refs);
  `CLAUDE.md`; `SECURITY.md`; full sweep across `spec/v1/**`, `spec/v2/**`,
  `spec/deployment/**`. The rebrand spec at
  `spec/v1/14-rebrand-applikon/` is intentionally left with its
  before/after references for historical context.

### What did NOT change

- Database schema, table, column names — no migration needed.
- API contract — endpoints, request/response shapes unchanged.
- Production domain `aplikujbezspiny.pl`.
- Logo image asset — same briefcase graphic, colours, font, layout. Only
  the wordmark text in `logo-trim.png` and `logo_white.png` is regenerated
  separately (filenames preserved so no import paths change).
- Favicon (`favicon.svg`) — untouched.

### Operational notes

- **JWT issuer change** invalidates all in-flight access tokens on first
  deploy after rebrand. Acceptable for a portfolio project (15-minute
  access token expiry).
- **localStorage key change** (`easyapply_token` → `applikon_token`) means
  existing browsers will trigger a fresh login after the deploy. Same
  rationale.
- **GitHub repo rename** `EasyApply` → `applikon` is performed manually
  outside the commit; GitHub auto-redirects old URLs.
- **Docker images** under `ghcr.io/jakubbone/easyapply-{backend,frontend}`
  remain reachable until next CI build; new pushes go to
  `ghcr.io/jakubbone/applikon-{backend,frontend}`.

---

## 12. Not Implemented (from spec)

| Item | Source | Notes |
|------|--------|-------|
| Salary change tracking (auto-note on update) | brief.md §5, i18n plan | `createSalaryChangeNote()` exists in NoteService but is never called from `ApplicationService.update()` — dead code, no user-visible effect |
| 5-column Kanban (SENT / IN_PROGRESS / OFFER / REJECTED and one more) | brief.md §4 | Already reduced to 3 columns in mvp-implementation-plan.md PHASE 3; as-built matches the implementation plan, not the brief |

---

## 13. v1 Completion Status

### What is done and working

- Full CRUD for applications, notes, CVs
- Kanban board with drag & drop and status transitions
- Notes with categories
- CV management (link/note types; file upload disabled per phase 07)
- Duplicate detection
- Authentication (Google OAuth2 + JWT + refresh + logout)
- i18n (EN/PL with language switcher)
- Gamification badges
- Onboarding/tour
- Flyway migrations (V1–V14, clean schema)
- Multi-user isolation (all queries scoped to user_id from JWT)
- Privacy policy page (/privacy, public, PL/EN)
- Consent flow (users must accept privacy policy before accessing app)
- Account deletion (DELETE /api/auth/me with cascade to all user data)
- Settings page with account management and data export
- Data export (GET /api/auth/me/export, RODO Art. 20 compliance)
- Service notices system (BANNER/MODAL with countdown; admin POST endpoint; public GET endpoint)
- Swagger UI at `/swagger-ui.html` with JWT Bearer auth scheme and all controllers tagged (phase 11)
- Vitest unit tests (backend + frontend, including Phase 08 SystemController and AdminController tests)
- Cypress E2E tests
- GitHub Actions CI (two parallel jobs: Maven tests + Vitest/build; badge in README)

### What is incomplete or pending

| Item | Type | Priority |
|------|------|----------|
| Salary change auto-note: wire `createSalaryChangeNote()` into `ApplicationService.update()` | Missing feature | `createSalaryChangeNote()` in NoteService is complete and tested; `ApplicationService.update()` needs salary change comparison logic and a call to that method |
| `rejectionDetails` not in frontend `Application` response type | Type gap | Backend returns `rejectionDetails` in `ApplicationResponse`; `domain.ts` `Application` interface doesn't declare it; field is sent correctly via `StageUpdateRequest` but cannot be displayed in UI |
| retention-hygiene (phase 07 part 3) | Deferred | Spec complete; implementation deferred post-MVP publication for infrastructure optimization |

### v1 overall assessment

All planned MVP features (PHASE 1–7) are implemented. Phase 07 (Privacy & RODO) completed rodo-minimum (consent flow, account deletion) and cv-link-only (file upload disabled). Phase 08 completed data export (RODO Art. 20) and service notices (BANNER/MODAL with countdown). Phase 10 added WARN logging for admin denials, failed token refreshes, and 404s. Phase 11 added Swagger UI at `/swagger-ui.html` with JWT Bearer auth and all controllers tagged. retention-hygiene (auto-delete inactive accounts, token hashing, log audit) is planned but deferred to post-publication.

Authentication, i18n, onboarding, Cypress E2E, React Query, and GitHub Actions CI were added beyond the spec. The two concrete gaps are: (1) salary change auto-note — the NoteService method exists but is not wired into `ApplicationService.update()`; (2) `rejectionDetails` missing from the frontend `Application` type.
