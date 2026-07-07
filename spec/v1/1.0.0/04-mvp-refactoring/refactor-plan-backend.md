# Backend Learning Plan — Applikon

## Document Context

This document is a learning guide for Jakub — author of Applikon.
Jakub is a junior Java developer. He knows Spring Boot at basic/intermediate level.
Backend was written with AI help — Jakub understands general architecture but doesn't want to dig deep into all implementation details. Main gaps: security, validation, design patterns.

**Goal:** Better understand backend flow, fix code review problems, fill security gaps. Not learning from zero — explaining what needs clarification.

**How sessions resume:** the `/mentor-refactor-backend` slash command loads this file plus `spec/v1/1.0.0/03-mvp-review/mvp-code-review.md` and `spec/v1/1.0.0/04-mvp-refactoring/learning/learning-notes-backend.md`, then continues from the current step.

---

## Project: Applikon — backend

**Stack:** Java 21, Spring Boot 3.4.1, Spring Security, OAuth2 + JWT (RS256),  
PostgreSQL, Flyway, Docker, Maven

**Package Structure (`com.applikon`):**
```
ApplikonApplication.java              — entry point (@SpringBootApplication)

config/
  SecurityConfig.java                  — Spring Security, CORS, OAuth2, JWT config

controller/
  ApplicationController.java           — CRUD job applications
  AuthController.java                  — /api/auth/me, /api/auth/refresh, /api/auth/logout
  CVController.java                    — upload/CRUD CV files
  NoteController.java                  — CRUD notes
  StatisticsController.java            — statistics and badges

dto/
  ApplicationRequest.java              — input data for creating/editing applications
  ApplicationResponse.java             — output data for applications
  BadgeResponse.java                   — single badge
  BadgeStatsResponse.java              — statistics with badges
  NoteRequest.java                     — input data for notes
  NoteResponse.java                    — output data for notes
  StageHistoryResponse.java            — stage history
  StageUpdateRequest.java              — recruitment stage change
  StatusUpdateRequest.java             — status change
  UserResponse.java                    — user data

entity/
  Application.java                     — job application entity
  ApplicationStatus.java               — enum statuses (SENT, IN_PROCESS, OFFER, REJECTION, GHOSTING)
  CV.java                              — CV entity (file or link)
  CVType.java                          — enum: UPLOADED, EXTERNAL_LINK
  ContractType.java                    — enum: EMPLOYMENT, B2B, CONTRACT, OTHER
  Note.java                            — note entity
  NoteCategory.java                    — enum note categories
  RejectionReason.java                 — enum rejection reasons
  SalarySource.java                    — enum salary information source
  SalaryType.java                      — enum: GROSS, NET
  StageHistory.java                    — stage history entity
  User.java                            — user entity (Google OAuth2)

exception/
  GlobalExceptionHandler.java          — @ControllerAdvice, error handling

repository/
  ApplicationRepository.java           — JPA repo + custom query (statistics)
  CVRepository.java                    — JPA repo CV
  NoteRepository.java                  — JPA repo notes
  StageHistoryRepository.java          — JPA repo stage history
  UserRepository.java                  — JPA repo users

security/
  AuthenticatedUser.java               — wrapper for logged-in user data
  CustomOAuth2UserService.java         — creating/updating User after Google login
  JwtAuthenticationConverter.java      — JWT → Authentication (Spring Security)
  JwtService.java                      — JWT generation and validation (RS256)
  MdcUserFilter.java                   — adds userId to MDC (logging context)
  OAuth2AuthenticationSuccessHandler.java — generates JWT after OAuth2 login, sets cookie

service/
  ApplicationService.java              — business logic for applications, stages, statuses
  CVService.java                       — file upload, validation, CV management
  NoteService.java                     — CRUD notes
  StatisticsService.java               — statistics, badges, thresholds
  UserService.java                     — user management
```

**Flyway Migrations:**
```
V1__init_schema.sql                    — initial schema (applications, cvs, notes, stage_history)
V2__add_session_id.sql                 — add session_id
V3__migrate_deprecated_statuses.sql    — migrate old statuses
V4__auth_schema.sql                    — users table, user_id columns in applications/cvs
```

**Tests:**
```
config/TestSecurityConfig.java                  — security config for tests
security/WithMockAuthenticatedUser.java         — annotation for mocking logged-in user
security/WithMockAuthenticatedUserSecurityContextFactory.java — factory for above

controller/
  ApplicationControllerTest.java                — REST controller tests
  CVControllerTest.java                         — REST controller tests
  NoteControllerTest.java                       — REST controller tests
  StatisticsControllerTest.java                 — REST controller tests

service/
  ApplicationServiceTest.java                   — business logic tests
  CVServiceTest.java                            — CV logic tests
  NoteServiceTest.java                          — note logic tests
  StatisticsServiceTest.java                    — statistics logic tests
```

---

## Mentor Mode Rules (APPLY THROUGHOUT LEARNING)

1. **Explanation Level:** Jakub is junior Java dev. Knows Spring Boot basics.
   DO NOT explain what `@Service`, `@Repository`, `@RestController` are — he knows.
   DO explain: security (OAuth2, JWT, CSRF, path traversal, XSS),
   patterns (State Machine, AOP proxy), things where CR shows gaps.

2. **Interaction:** After explaining each topic ask if Jakub understands.
   Don't move forward without confirmation.

3. **Control Questions:** After each step 2-3 specific questions.
   Concrete, referencing the project.

4. **Notes After Each Step:** Save summary to `spec/v1/1.0.0/04-mvp-refactoring/learning/learning-notes-backend.md`.
   Format: step heading, key concepts, important files, what was fixed.

5. **Always Show Code:** Discuss specific project files. Point to line.

6. **CR Integrated With Learning:** When CR points to problem in current step —
   first explain mechanism, then fix together with Jakub.

7. **Ask for Confirmation:** Don't skip questions. If Jakub asks — answer.

8. **Don't Commit:** Jakub makes commits himself.

---

## Work Flow For Each CR Fix

Same as frontend. Each change goes through:

```
1. EXPLAIN   — explain mechanism (why it's error / how it works)
2. READ      — read current file before change (Read tool)
3. FIX       — make change (Edit tool)
4. TEST PLAN — note which tests will need updating or adding
                  (existing test broken? new logic = new test?)
5. RESTART   — remind Jakub to restart backend and test manually
                  (give specific: which endpoint, which request)
6. QUESTION  — ask: "Mark CR-X as fixed in progress table?"
7. UPDATE    — if Jakub confirms: update status in tables (⬜ → ✅)
                  and add entry to "Session Notes"
```

**End of step (not after every fix):**
- Run `mvn test` in `applikon-backend`. If broken — update tests, re-run until green.
- Run `mvn compile` to confirm compilation.
- Only then mark the step complete.

**Important Rules:**
- Don't run `mvn test` / `mvn compile` after each CR fix — batch them at the end of the step.
- New tests only when new logic appears (e.g., magic bytes validation) or existing tests don't cover the scenario (e.g., path traversal).
- Step 5 (restart) is Jakub's task, not Claude's.
- If end-of-step tests don't pass — **don't close the step** until green.

---

## Learning Progress

| Step | Topic | Learning | CR Fixed This Step |
|-------|-------|----------|-------------------|
| 1 | Architecture Overview — flow and components | ✅ | — |
| 2 | Security — OAuth2, JWT, cookies | ✅ | CR-5, CR-3 (backend) |
| 3 | Security — data and file validation | ✅ | CR-1, CR-B1, CR-B2, CR-B3 |
| 4 | Code Quality and Patterns | ✅ | CR-10, CR-B4, CR-B5, CR-B7, CR-B8, CR-B9, CR-B10 |
| 5 | Testing — overview, completion, coverage | ✅ | — |

After each step Claude asks:
> _"Should we mark Step X as complete? I'll update table and notes."_

---

## List of Fixes from CR (Progress Tracking)

Source: `spec/v1/1.0.0/03-mvp-review/mvp-code-review.md` (reviewer: DR & AI)

### 🔴 Critical (security / correctness)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-1 | Path traversal in CV upload | `CVService.java` | 3 | ✅ | ✅ |
| CR-5 | Missing SameSite on refresh_token cookie | `OAuth2AuthenticationSuccessHandler.java` | 2 | ✅ | ✅ |
| CR-3 | Refresh token contract — backend returns `"token"` instead of `"accessToken"` | `AuthController.java` | 2 | ✅ | ✅ |
| CR-B1 | No URL validation in backend (externalUrl in CV) | `CVService.java` | 3 | ✅ | ✅ |
| CR-B3 | File validation only Content-Type, missing magic bytes | `CVService.java` | 3 | ✅ | ✅ |

### 🟡 Important (correctness / quality)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-B2 | No @NotNull on status in StageUpdateRequest | `StageUpdateRequest.java` | 3 | ✅ | ✅ |
| CR-10 | @Transactional on private method (AOP ignores) | `ApplicationService.java` | 4 | ✅ | ✅ |
| CR-B7 | user_id nullable — no NOT NULL constraint | new Flyway migration | 4 | ✅ | ✅ |
| CR-B9 | Validation errors as string instead of field map | `GlobalExceptionHandler.java` | 4 | ✅ | ✅ |

### 🟢 Nice to Have (code quality)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-B4 | Object[] in statistics query → projection/DTO | `ApplicationRepository.java`, `StatisticsService.java` | 4 | ✅ | ✅ |
| CR-B5 | 5 parallel arrays in StatisticsService → record Badge | `StatisticsService.java` | 4 | ✅ | ✅ |
| CR-B8 | Deprecated enums in NoteCategory (PYTANIE, KONTAKT) | `NoteCategory.java` + migration | 4 | ✅ | ✅ |
| CR-B10 | Comments on business rules in updateStage() | `ApplicationService.java` | 4 | ✅ | ✅ |

**Legend:**
- **Status** ⬜/✅ — code change done
- **Tested** ⬜/✅ — tests passed AND Jakub verified manually

---

## Detailed Step Descriptions

---

### Step 1 — Architecture Overview — Flow and Components

**Goal:** Understand how request flows through backend from HTTP to database and back.
Know what each layer does and how they connect. Not from zero — at level "I know where to look".

**What We Discuss:**

1. **Request → Response Flow (creating application example):**
   ```
   POST /api/applications
     → Spring Security filter chain (JWT → Authentication)
     → MdcUserFilter (userId to logs)
     → ApplicationController.create()
     → @Valid → DTO validation
     → ApplicationService.create()
     → ApplicationRepository.save()
     → response DTO → JSON → 201 Created
   ```

2. **Security filter chain — before request reaches controller:**
   - `SecurityConfig.java` — config: which endpoints public, which protected
   - `JwtAuthenticationConverter` — JWT from `Authorization: Bearer` to Spring Security Authentication
   - `MdcUserFilter` — adds userId to MDC (logging context)
   - `@AuthenticationPrincipal AuthenticatedUser` — how controller gets logged-in user

3. **Layers and Their Responsibilities:**
   - Controller — HTTP validation (@Valid), mapping, response codes
   - Service — business logic, transactions, rules
   - Repository — database access (Spring Data JPA)
   - Entity — data model (tables)
   - DTO — contract with frontend (request/response)

4. **Configuration Overview:**
   - `application.properties` — environment variables, profiles (local/dev/prod)
   - `SecurityConfig.java` — heart of security
   - Flyway migrations — schema evolution

**Files to Open:**
- `SecurityConfig.java` — security core
- `ApplicationController.java` — example controller
- `ApplicationService.java` — example service
- `application.properties` — config

**CR Related:** none, just overview.

---

### Step 2 — Security — OAuth2, JWT, Cookies

**Goal:** Understand complete login flow from backend side.
Fix cookie and token contract issues.

**What We Discuss:**

1. **OAuth2 Flow (backend side) step by step:**
   ```
   1. Frontend redirect → Google
   2. Google callback → Spring Security OAuth2 filter
   3. CustomOAuth2UserService — creates/updates User in database
   4. OAuth2AuthenticationSuccessHandler:
      a) generates access token (JWT, RS256, 15 min)
      b) generates refresh token (JWT, RS256, 7 days)
      c) sets refresh token as httpOnly cookie
      d) redirect frontend with access token in URL
   ```

2. **JwtService — token generation:**
   - RS256 (asymmetric) — private key signs, public key verifies
   - Why RS256 not HS256
   - Claims: subject (userId), iat, exp

3. **Refresh token flow:**
   - AuthController.refresh() — validates cookie, generates new access token
   - Why refresh token in httpOnly cookie (unreachable by JS = XSS protection)

4. **CSRF and SameSite — what is it and why:**
   - CSRF Attack — attacker tricks browser into sending request from your cookie
   - SameSite=Lax — browser won't send cookie from foreign sites
   - Why missing SameSite is problem (CR-5)

5. **Token contract (CR-3):**
   - Backend returns `"token"`, frontend expects `"accessToken"`
   - How this breaks refresh
   - How to fix and why

**Files to Open:**
- `OAuth2AuthenticationSuccessHandler.java` — token generation, cookie
- `JwtService.java` — JWT creation and validation
- `CustomOAuth2UserService.java` — user creation after OAuth2
- `AuthController.java` — /me, /refresh, /logout
- `SecurityConfig.java` — filter configuration

**CR to Fix:**
- **CR-5:** Add `SameSite=Lax` to refresh_token cookie. Explain CSRF, fix.
- **CR-3 (backend part):** Fix key in response — `"token"` → `"accessToken"`.

**Nice to Have at End of Step:** none

---

### Step 3 — Security — Data and File Validation

**Goal:** Fix critical security holes — path traversal, URL validation,
file validation, DTO validation. Most important step for security.

**What We Discuss:**

1. **Path Traversal (CR-1) — CRITICAL:**
   - How attack works: filename `../../etc/cron.d/malicious` → write outside uploads
   - Defense: `resolve()` + `normalize()` + `startsWith(uploadDir)`
   - Better approach: UUID as filename on disk, original name only in database
   - Show in code `CVService.java` — where exactly is the hole

2. **URL Validation in Backend (CR-B1):**
   - Frontend validates, but API is public, someone can bypass
   - `externalUrl` in CV — someone sends `javascript:alert(1)` directly to API
   - Validation: scheme only `http://` or `https://`

3. **File Validation — Magic Bytes (CR-B3):**
   - Content-Type is browser-set and easily forged
   - Magic bytes — first bytes identify file type:
     - PDF: `%PDF-` (hex: `25 50 44 46 2D`)
     - DOCX: `50 4B 03 04` (DOCX is ZIP)
   - Validate: magic bytes + Content-Type + extension (triple validation)

4. **DTO Validation — @NotNull (CR-B2):**
   - `StageUpdateRequest.status` — no @NotNull → null passes → NPE → 500
   - Should be @NotNull → readable 400 Bad Request
   - Rule: validation at system boundary (API), not inside service

**Files to Open:**
- `CVService.java` — upload, path traversal, file validation, URL
- `StageUpdateRequest.java` — missing @NotNull
- `GlobalExceptionHandler.java` — how validation errors returned

**CR to Fix:**
- **CR-1:** Path traversal — fix upload in `CVService.java`
- **CR-B1:** URL validation — add scheme check in `CVService.java`
- **CR-B3:** Magic bytes — add file content validation in `CVService.java`
- **CR-B2:** @NotNull on status in `StageUpdateRequest.java`

**Nice to Have at End of Step:** none (all important)

---

### Step 4 — Code Quality and Patterns

**Goal:** Fix code quality, patterns, data integrity.
Step mixed — some fixes important (stage history, user_id NOT NULL),
some nice-to-have (Object[] → projection).

**What We Discuss:**

1. **@Transactional on Private Method (CR-10):**
   - How Spring AOP works — proxy wraps bean
   - Proxy intercepts only public methods called from outside
   - Private method = proxy can't see = @Transactional ignored
   - Here: no practical impact (called from transactional method),
     but annotation misleading — remove for clarity

2. **user_id Nullable (CR-B7):**
   - Migration V4 adds column nullable ("for now, existing have null")
   - But never adds NOT NULL
   - Result: database allows orphaned records
   - Fix: new migration — backfill + ALTER TABLE SET NOT NULL

3. **Validation Errors as String (CR-B9):**
   - Now: all errors concatenated in one text → frontend doesn't know which field
   - Correct: map `{field: message}` via `ProblemDetail.setProperty()`
   - Standard RFC 9457

4. **[Nice to Have] Object[] → Projection (CR-B4):**
   - Statistics query returns Object[] — lose types, brittle
   - JPQL constructor expression: `SELECT new StatsDto(...) FROM ...`
   - Alternatively: interface projection

5. **[Nice to Have] Parallel Arrays → Record (CR-B5):**
   - 5 arrays (names, icons, descriptions, thresholds, colors) synchronized by index
   - One element off = all badges broken
   - Solution: `record Badge(String name, String icon, String description, int threshold, String color)`

6. **[Nice to Have] Deprecated Enums (CR-B8):**
   - `NoteCategory`: PYTANIE and KONTAKT coexist with PYTANIA, FEEDBACK, INNE
   - Flyway migration replaces old → new, then remove from enum

7. **[Nice to Have] Comments on Business Rules (CR-B10):**
   - `updateStage()` — complex conditional logic without comments
   - Comments explain "why" rule exists, not "what" code does

**Files to Open:**
- `ApplicationService.java` — @Transactional, updateStage(), stage history
- `StageHistoryRepository.java` — save history
- `GlobalExceptionHandler.java` — error format
- `StatisticsService.java` — parallel arrays, Object[]
- `ApplicationRepository.java` — custom query
- `NoteCategory.java` — deprecated enums

**CR to Fix (Important):**
- **CR-10:** Remove @Transactional from private method
- **CR-B7:** New migration — NOT NULL on user_id
- **CR-B9:** Validation errors as field map

**Nice to Have at End of Step:**
- CR-B4: Object[] → projection/DTO
- CR-B5: Parallel arrays → record Badge
- CR-B8: Deprecated enums + migration
- CR-B10: Comments on business rules

---

### Step 5 — Testing — Overview, Completion, Coverage

**Goal:** Understand existing tests, run them, add tests for fixed items
(path traversal, null status, magic bytes, URL validation).

**What We Discuss:**

1. **Test Levels:**
   - Service tests (`@ExtendWith(MockitoExtension.class)`) — no Spring, fast
   - Controller tests (`@SpringBootTest + @AutoConfigureMockMvc`) — full context, slow

2. **TestSecurityConfig — why no JWT:**
   - Main config blocks every request without JWT (401). In tests we don't generate tokens.
   - `TestSecurityConfig` active only `@Profile("test")` with `@Order(1)` — higher priority
   - Spring Security takes first matching chain → everything allowed
   - Auth in tests: `@BeforeEach` sets `AuthenticatedUser` manually in `SecurityContextHolder`

3. **@Order in Project — Three Contexts:**
   - `TestSecurityConfig` @Bean SecurityFilterChain — which filter chain Spring picks
   - `GlobalExceptionHandler` @RestControllerAdvice — exception handler priority
   - Test classes @Test methods — test execution order

4. **Strict Stubbing in Mockito:**
   - `STRICT_STUBS` by default — unused mock = error. Philosophy: test is stale if mock not called

5. **updateStage vs addStage — Semantic Difference:**
   - `updateStage()` (PATCH) — changes status (SENT → IN_PROCESS → REJECTED). Does NOT save stage_history.
   - `addStage()` (POST) — adds stage within IN_PROCESS. Saves to stage_history.

6. **Added Tests (6 New, Total 90):**
   - magic bytes, path traversal, URL validation, null status, stage history

**Files to Open:**
- `src/test/java/com/applikon/service/CVServiceTest.java` — CV tests
- `src/test/java/com/applikon/service/ApplicationServiceTest.java` — app tests
- `src/test/java/com/applikon/controller/ApplicationControllerTest.java` — controller tests
- `src/test/resources/application-test.properties` — test config

**CR Related:** none new, add tests for fixes from steps 2-4.

---

## Session Notes

After each session Claude updates this section. Format: date, what discussed,
what understood, what needs repeat, next step.

---

(Session notes will be added after each session)
