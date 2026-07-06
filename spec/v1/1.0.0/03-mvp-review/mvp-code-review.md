# Code Review: Applikon Project (2026-03-01)

### 👤 Basic Information
**Author:** Jakub  
**Project:** Applikon — job application tracker for junior IT candidates  
**Review Date:** 2026-03-01  
**Reviewers:** DR & AI  
**Skill Level:** Beginner/Intermediate — solid foundations and ambition in architecture visible, but typical gaps for someone without commercial experience  

---

## 🌟 PART I: GENERAL SUMMARY

### ✅ What Deserves Praise

1. **Mature full-stack architecture** — the project combines Spring Boot (Java 21) with React + TypeScript, PostgreSQL, and Docker Compose. This is not trivial and shows courage and ambition. Clear separation into backend/frontend with proper layers (controller → service → repository → entity) is textbook approach.

2. **Correct OAuth2 + JWT implementation** — authentication flow through Google OAuth2, access token generation (RS256) with 15-minute lifespan, and refresh tokens stored in httpOnly cookie — solid implementation. Comments in code (e.g., in `OAuth2AuthenticationSuccessHandler`) explain "why" not just "what" — that's good documentation.

3. **Database migrations with Flyway** — instead of relying on `ddl-auto=update` (common beginner mistake), project uses versioned SQL migrations. Setting `ddl-auto=validate` in production shows professional thinking.

4. **React Query (TanStack Query)** — excellent choice for server state management. Hooks (`useApplications`, `useCV`, `useNotes`) are readable, correctly configured for cache and invalidation. Pattern with `queryKeys` as constants prevents typos.

5. **TypeScript with strict mode** — entire configuration (`noUnusedLocals`, `noUnusedParameters`, `isolatedModules`) enforces discipline. Domain types in `domain.ts` well designed.

6. **Docker Compose with health checks** — multi-container configuration with `service_healthy` condition for database, volumes for data and uploads, plus health checks for backend shows operational thinking.

7. **MDC Logging** — adding `userId` to logging context (via `MdcUserFilter`) is advanced technique that greatly helps debugging in multi-user environments.

---

## 🎓 PART II: LEARNING AND EDUCATION

### 💭 Questions to Consider

1. **What happens when user clicks "Login with Google" and backend is unavailable?** Look at `LoginPage.tsx` — should backend URL be hardcoded in code? How will that affect deployment?

2. **Imagine you have 500 job applications. How will table and Kanban board behave?** Think about what `filter()` and `sort()` without memoization mean on every render. Read about `useMemo` and when it's really needed.

3. **Why is `markCurrentStageCompleted()` marked `@Transactional` on a private method?** Check how Spring AOP handles annotations on private methods. The answer might surprise you.

4. **What happens to CV file on disk if database write fails?** Look at `CVService.uploadCV()` step order — are file operations covered by database transaction?

5. **What data will attacker see if they manage to inject JavaScript into page with job posting links?** Think about URL validation in `ApplicationDetails.tsx` and `CVManager.tsx`.

### 📚 Concepts to Study

| Concept | Why Important | Where in Your Code |
|---------|---------------|--------------------|
| **Memoization in React** | Prevents expensive recalculations on every render | `ApplicationTable.tsx` — sorting and filtering |
| **Spring AOP Proxy** | `@Transactional` on private methods doesn't work | `ApplicationService.markCurrentStageCompleted()` |
| **State Machine Pattern** | Orders complex state transitions | `ApplicationService.updateStage()` |
| **Content Security Policy** | Protects against XSS at HTTP header level | Nginx config and Spring Security |
| **SameSite Cookie Attribute** | Protects against CSRF in modern browsers | `OAuth2AuthenticationSuccessHandler` |
| **React Error Boundary** | Prevents "white screen" when component crashes | Missing from project — worth adding |
| **API Pagination** | Essential with large datasets | Endpoints `/api/applications` |
| **HTTP Interceptor (retry after token refresh)** | Transparent session refresh without interruption | `api.ts` — currently redirects on 401 |
| **Data Integrity (NOT NULL constraints)** | Guarantees every record has owner | Migration V4 — `user_id` column without NOT NULL |

### 📖 Terminology Glossary

| Term | Explanation | Learning Materials |
|------|-------------|-------------------|
| **OAuth2** | Authorization protocol allowing login via external services (e.g., Google) | [OAuth 2.0 Simplified](https://www.oauth.com/) |
| **JWT (JSON Web Token)** | Standard token format for stateless authentication | [JWT.io Introduction](https://jwt.io/introduction) |
| **RS256** | Asymmetric signature algorithm (private key signs, public key verifies) | [Auth0 - RS256 vs HS256](https://auth0.com/blog/rs256-vs-hs256-whats-the-difference/) |
| **httpOnly Cookie** | Cookie invisible to JavaScript — protection against XSS | [MDN - Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) |
| **CSRF** | Attack that tricks browser into performing action on your behalf | [OWASP - CSRF](https://owasp.org/www-community/attacks/csrf) |
| **N+1 Problem** | Executing N additional SQL queries instead of one with JOIN | [Hibernate N+1](https://vladmihalcea.com/n-plus-1-query-problem/) |
| **EntityGraph (JPA)** | Mechanism to control eager/lazy loading without changing mapping | [Baeldung - JPA EntityGraph](https://www.baeldung.com/jpa-entity-graph) |
| **Flyway** | Tool for versioning and migrating database schema | [Flyway Documentation](https://documentation.red-gate.com/flyway) |
| **React Query** | Library for managing server state and caching | [TanStack Query Docs](https://tanstack.com/query/latest) |
| **useMemo** | React hook to memoize expensive calculations | [React Docs - useMemo](https://react.dev/reference/react/useMemo) |
| **Spring AOP Proxy** | Proxy mechanism in Spring — annotations work only on public methods called from outside bean | [Baeldung - Spring AOP](https://www.baeldung.com/spring-aop) |
| **ProblemDetail (RFC 9457)** | Standard format for REST API error responses | [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) |
| **Path Traversal** | Attack escaping allowed directory with `../` sequences | [OWASP - Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal) |
| **XSS** | Injecting malicious JavaScript into page | [OWASP - XSS](https://owasp.org/www-community/attacks/xss/) |
| **Magic Bytes** | First bytes of file identifying its actual type (e.g., PDF: `%PDF-`) | [Wikipedia - File Signatures](https://en.wikipedia.org/wiki/List_of_file_signatures) |
| **JaCoCo** | Tool measuring code test coverage in Java projects | [JaCoCo Documentation](https://www.jacoco.org/jacoco/trunk/doc/) |
| **HTTP Interceptor** | Mechanism intercepting HTTP requests/responses to add logic (e.g., token refresh) | [Axios Interceptors](https://axios-http.com/docs/interceptors) |

### 🔍 Areas for Self-Analysis

1. **Look at `KanbanBoard.tsx`** — nearly 1000 lines of code. How many components, hooks, and modals are nested in it? Read about Single Responsibility Principle and try extracting at least 3 independent files.

2. **Check how `CVManager.tsx` fetches data** — compare with `ApplicationTable` and `NotesList`. Notice: one uses React Query, another `useState + useEffect` with manual `fetchCVs()`. Think why this inconsistency is problematic.

3. **Analyze endpoint `/api/applications`** — returns all user applications without pagination. Imagine user has 2000 records with stage history. Read about Spring Data `Pageable` and its performance impact.

### 🎯 Knowledge Gaps to Fill

1. **Web application security** — URL validation, XSS protection, proper cookie attributes (SameSite), Content Security Policy. Absolute foundation before entering job market.

2. **React performance optimization** — memoization (`useMemo`, `useCallback`, `React.memo`), long list virtualization, component decomposition. Essential when scaling.

3. **Spring design patterns** — especially State Machine Pattern (for status transitions), proper `@Transactional` usage (proxy vs self-invocation), data validation patterns.

4. **Testing** — project has test infrastructure (Vitest, Cypress), but code test coverage needs expansion. Read about test pyramid and "test the behavior, not the implementation" strategy.

---

## ⚙️ PART III: TECHNICAL CODE REVIEW

### 📊 Thematic Analysis

#### 1️⃣ Algorithm Correctness

Overall logic is correct — CRUD applications, CV management, notes, badge system work as specified. OAuth2 flow follows specification. Few observations:

```
⚠️ Problem: [CRITICAL] JSON contract for refresh token inconsistent between backend and frontend
📍 Location: Authentication controller (backend) and API layer (frontend)
💡 Hint: Backend returns key "token", frontend expects "accessToken". This means the session refresh mechanism actually doesn't work — after access token expires, user is logged out instead of being refreshed silently. Check both files and align key names.
```

```
⚠️ Problem: [IMPORTANT] Recruitment stage history not updated in main status change flow
📍 Location: Application service — stage update method and stage addition method (backend)
💡 Hint: When you drag card on Kanban board, frontend calls stage update method which changes status but doesn't create entries in stage_history table. Separate method for adding stage (with history save) exists but isn't called from UI. Result: stage_history table doesn't reflect actual user transitions. Think about unifying both paths into one consistent flow.
```

```
⚠️ Problem: Method markCurrentStageCompleted() is private and marked @Transactional
📍 Location: Application service — business logic (backend)
💡 Hint: Spring AOP doesn't intercept calls to private methods — @Transactional annotation is ignored here. Practical impact in this case is minimal because method is called from public addStage() which already has active transaction. Still worth removing misleading annotation — for code clarity and to demonstrate understanding of Spring AOP.
```

```
⚠️ Problem: Logic for state transitions (SENT → IN_PROGRESS → OFFER/REJECTION) scattered in one large method with many nested conditions
📍 Location: Stage update method in application service
💡 Hint: Read about State Machine pattern — it lets you define allowed transitions and accompanying actions declaratively. Spring Statemachine or even simple enum with canTransitionTo() method would significantly simplify code.
```

#### 2️⃣ Critical Problems

```
⚠️ Problem: [CRITICAL] Backend URL hardcoded to "http://localhost:8080" in login component
📍 Location: Login page (frontend)
💡 Hint: On production this won't work. Check how you use Vite environment variables (import.meta.env) elsewhere in code — apply same pattern here.
```

```
⚠️ Problem: [CRITICAL] No validation of external URLs (job posting links and CV links)
📍 Location: Components displaying application details and CV manager (frontend)
💡 Hint: Link can contain scheme "javascript:" instead of "https://". Read about XSS through href attribute and write simple validation function allowing only http/https/mailto schemes.
```

```
⚠️ Problem: [CRITICAL] Missing SameSite attribute on refresh_token cookie
📍 Location: OAuth2 authentication success handler (backend security)
💡 Hint: Without SameSite, attacker can execute CSRF request to /api/auth/refresh endpoint and obtain new access token. Check how to set SameSite=Strict or Lax on Cookie object in Java.
```

```
⚠️ Problem: [CRITICAL] File validation relies solely on Content-Type header
📍 Location: CV service (backend)
💡 Hint: Content-Type is set by browser and easily forged. Read about "magic bytes" (file signature) — PDF always starts with "%PDF-". Check actual file content, not just declared type.
```

```
⚠️ Problem: [CRITICAL] Path traversal vulnerability in CV file upload
📍 Location: CV service — upload method (backend)
💡 Hint: Original filename from request goes directly into save path (UUID + "_" + original name). Attacker can manipulate filename (e.g., "../../etc/cron.d/malicious") and write file outside uploads directory. Check if resolved path still starts with target directory (normalize() + startsWith()). Even better approach — use UUID as disk filename, store original name only in database.
```

```
⚠️ Problem: [IMPORTANT] Field status in stage update request has no @NotNull validation
📍 Location: Stage update DTO (backend)
💡 Hint: If frontend sends request without status field (or with null), service calls setStatus(null) on entity, resulting in 500 error instead of readable 400. Add @NotNull annotation and consider business rules — e.g., should rejectionReason be required when status is REJECTION.
```

#### 3️⃣ KISS Principle (Simplicity)

```
⚠️ Problem: KanbanBoard.tsx has nearly 1000 lines with multiple nested components, modals, and drag & drop logic
📍 Location: Kanban board component (frontend)
💡 Hint: Consider splitting into: KanbanCard, KanbanColumn, StageModal, EndModal, MoveModal and hook useKanbanDragDrop. Each file should have single responsibility.
```

```
⚠️ Problem: TourGuide.tsx — over 570 lines with interval running every 100ms to recalculate positions
📍 Location: App tour guide component (frontend)
💡 Hint: Read about ResizeObserver — native browser API reacting to element size changes without continuous polling. More efficient than setInterval.
```

```
⚠️ Problem: Badge statistics — 5 parallel arrays (names, icons, descriptions, thresholds, colors) must be perfectly synchronized
📍 Location: Statistics service (backend)
💡 Hint: One element shifted by index breaks all badges. Consider class or record Badge grouping this data together.
```

#### 4️⃣ Code Readability

```
⚠️ Problem: Statistical query returns Object[] — loss of type safety and readability
📍 Location: Application repository and statistics service (backend)
💡 Hint: Read about JPQL constructor expressions (SELECT new com.applikon.dto.StatsDto(...) FROM ...) or interface-based projections in Spring Data. They return typed result instead of raw object array.
```

```
⚠️ Problem: Mapping entity ↔ DTO done manually setter by setter
📍 Location: create() and update() methods in application service (backend)
💡 Hint: Check MapStruct library or consider factory method Application.fromRequest(). Manual mapping of 12+ fields is error-prone and misses new fields.
```

#### 5️⃣ Style and Conventions

Polish UI messages are good choice for target user. Few observations:

```
⚠️ Problem: Inconsistent data fetching approach — CVManager uses useState+useEffect, rest of components use React Query
📍 Location: CV manager vs. other components (frontend)
💡 Hint: You have ready hooks useCV() — why doesn't CVManager use them and is worth unifying. Code consistency helps maintenance.
```

```
⚠️ Problem: Deprecated values in note category enum (PYTANIE, KONTAKT) coexist with new ones (PYTANIA, FEEDBACK, INNE)
📍 Location: Note category enum (backend) and mapping in notes component (frontend)
💡 Hint: Read about data migration strategies — if old values aren't used anymore, consider Flyway migration replacing them, then remove from enum.
```

#### 6️⃣ Structure and Organization

Positive:
- Separation into layers (controller/service/repository/entity) is textbook
- Frontend has logical division: auth/, pages/, components/, hooks/, services/, types/
- Components moved to subdirectories (applications/, kanban/, cv/, notes/)

```
⚠️ Problem: AppContent.tsx is generic name but serves as main dashboard layout
📍 Location: Main content component (frontend)
💡 Hint: Consider renaming to DashboardLayout or MainLayout — name should communicate purpose.
```

```
⚠️ Problem: Status colors constants duplicated in at least two components
📍 Location: Application details and table (frontend)
💡 Hint: Extract shared constants (status colors, date formatting) to utils/ or constants/ file — DRY principle.
```

```
⚠️ Problem: [IMPORTANT] Column user_id in applications and cvs tables remains without NOT NULL constraint
📍 Location: Database migration V4 (backend)
💡 Hint: Migration adds user_id as nullable ("for now, existing rows have null"), but never adds final NOT NULL constraint. Result: database allows records without owner — such "orphaned" data will be invisible in queries filtered by user. Add another Flyway migration setting NOT NULL after cleaning any null values.
```

#### 7️⃣ Documentation and Comments

Positive:
- Comments in `OAuth2AuthenticationSuccessHandler` explain "why" (e.g., why token in URL)
- JSDoc in `api.ts` describes header logic and authentication
- Polish comments in `App.tsx` explain React Query configuration

```
⚠️ Problem: No comments on business rules in updateStage()
📍 Location: Application service — stage update method (backend)
💡 Hint: Complex conditional logic (what happens when transitioning from REJECTION to IN_PROGRESS?) should have comments explaining business rules. Future "you" will thank present "you".
```

#### 8️⃣ Testability

```
⚠️ Problem: Test infrastructure exists (Vitest, Cypress, test-utils.tsx), but code coverage is limited
📍 Location: test/ directory (frontend)
💡 Hint: Testing priorities: 1) React Query hooks, 2) Components with conditional logic (KanbanBoard, CVManager), 3) Helper functions. Read about test pyramid — unit tests at bottom, E2E on top.
```

```
⚠️ Problem: Backend — unit tests of services exist (ApplicationServiceTest, CVServiceTest, NoteServiceTest, StatisticsServiceTest), but worth checking coverage
📍 Location: test/ directory (backend)
💡 Hint: Good that service tests exist — important foundation. Check if they cover edge cases: what if status is null in updateStage()? Is path traversal in filename tested? Read about JaCoCo — tool measuring code test coverage.
```

#### 9️⃣ Error Handling

```
⚠️ Problem: [IMPORTANT] Missing global Error Boundary in React app
📍 Location: Main application component (frontend)
💡 Hint: Without Error Boundary one error in any component causes "white screen". Read about React Error Boundaries — class component with componentDidCatch() method.
```

```
⚠️ Problem: [IMPORTANT] Validation errors in API returned as one text string instead of field-to-message structure
📍 Location: Global exception handler (backend)
💡 Hint: Frontend can't map errors to specific form fields (e.g., "company field required"). Read about ProblemDetail.setProperty() — allows adding custom data to response.
```

```
⚠️ Problem: [IMPORTANT] Deleting CV file on error logged as warning but CV marked as deleted in database
📍 Location: CV service (backend)
💡 Hint: This causes "file leak" on disk. Consider compensation pattern — what to do when file operation fails.
```

```
⚠️ Problem: [IMPORTANT] Calling new URL() without exception handling causes component crash
📍 Location: CV manager — displaying list (frontend)
💡 Hint: If user saved invalid URL as CV link, calling new URL(externalUrl).hostname throws TypeError, which — without Error Boundary — causes "white screen". Wrap URL parsing in try/catch and display fallback text (e.g., just the URL value or "invalid link" message).
```

```
⚠️ Problem: apiFetch() on 401 redirect but doesn't stop further processing
📍 Location: API layer (frontend)
💡 Hint: After window.location.href later code can still execute. Consider throw new Error() after redirect to be safer.
```

---

## ⚖️ PART IV: SOLUTION ANALYSIS

### Approach Comparison

| Your Solution | Advantages | Disadvantages | Alternative | When to Use |
|---|---|---|---|---|
| JWT in URL parameter after OAuth2 | Simple to implement in redirect flow | Visible in server logs, browser history, vulnerable to XSS | URL fragment (#token=...) or postMessage() | Fragment URL — when you have SPA with client-side routing |
| localStorage for access token | Easy access from JavaScript, survives page refresh | Accessible to any JS script (XSS) | httpOnly cookie with Secure + SameSite flags | Cookie — when priority is security |
| Manual entity → DTO mapping (setter by setter) | No extra library, full control | Error-prone, boilerplate, easy to miss field | MapStruct, ModelMapper or factory method | MapStruct — for projects with many DTOs |
| useState + useEffect in CVManager | Works, simplicity | No cache, manual loading/error state, inconsistent with rest | React Query (TanStack Query) — already in project | React Query — always for fetching from API |
| Object[] for statistical queries | Fast to write | No types, column order shift breaks retrieval | JPQL constructor expression or interface projection | Constructor expression — for complex queries |
| 5 parallel arrays in StatisticsService | Fast to write | Each change requires synchronizing 5 arrays | Class/record Badge with fields: name, icon, description, threshold, color | Record — when data logically related |
| Content-Type only for file validation | Minimal effort, easy implementation | Content-Type is declarative, easily forged | Magic bytes validation + Content-Type + extension | Triple validation — for production file uploads |
| setInterval(100ms) in TourGuide | Simple, always up-to-date positions | Wastes CPU, 10 calls per second | ResizeObserver + MutationObserver | Observer — when reacting to DOM changes |
| Redirect to /login on 401 | Simple, guarantees logout | User loses context, no silent refresh | Interceptor: 401 → refresh → retry request | Interceptor — when you have refresh token mechanism |

---

## 📊 PART V: METRICS AND STANDARDS

### Convention Compliance

| Area | Rating | Notes |
|------|--------|-------|
| **Naming (Java)** | ✅ Very Good | CamelCase correct, classes/interfaces proper, methods descriptive |
| **Naming (TypeScript)** | ✅ Very Good | PascalCase for components, camelCase for variables |
| **Project Structure** | ✅ Good | Backend and frontend properly separated |
| **REST API** | ✅ Good | Correct HTTP methods, status codes (201, 204), resource names |
| **Git Commits** | ✅ Good | Conventional Commits, sensible descriptions |
| **TypeScript strict** | ✅ Very Good | Strict mode enabled with additional rules |
| **Null/undefined Handling** | ⚠️ Needs Improvement | Non-null assertions (!) occasionally appear without validation |
| **Layer Separation** | ✅ Good | Controllers don't contain business logic |

### Code Complexity

| File | Lines | Complexity | Notes |
|------|-------|-----------|-------|
| `KanbanBoard.tsx` | ~987 | 🔴 High | Needs decomposition — too many responsibilities |
| `CVManager.tsx` | ~650 | 🟡 Medium | Could extract models and forms |
| `TourGuide.tsx` | ~572 | 🟡 Medium | Position logic could be separate hook |
| `ApplicationService.java` | ~196 | 🟢 Low | But updateStage() method too complex |
| `StatisticsService.java` | ~120 | 🟡 Medium | Fragile code with parallel arrays |
| `api.ts` | ~275 | 🟢 Low | Readable, well organized |

### Potential Performance Issues

| Problem | Impact | Where |
|---------|--------|-------|
| No API pagination | 🔴 High with many records | Endpoint `/api/applications` |
| No memoization for sort/filter | 🟡 Medium | `ApplicationTable.tsx` |
| No statistics caching | 🟡 Medium | `StatisticsService` — recalculates every request |
| setInterval(100ms) | 🟡 Medium | `TourGuide.tsx` |
| 10+ useState in one component | 🟡 Low-Medium | `KanbanBoard.tsx` — potential excessive re-renders |

### Potential Data Integrity Problems

| Problem | Impact | Where |
|---------|--------|-------|
| user_id nullable (no NOT NULL) | 🔴 High — orphaned records | Migration V4: tables applications, cvs |
| Inconsistent stage history | 🟡 Medium — no audit trail | updateStage() doesn't record stage_history |
| Refresh token contract mismatch | 🔴 High — mechanism doesn't work | Backend: "token", frontend: "accessToken" |

---

## 🎯 PART VI: ACTION PLAN

### To Do Now (Before Merge)

1. **🔴 Secure CV upload against path traversal** — file save path contains original name without sanitization. Add validation: after `resolve()` check `normalize()` + `startsWith(uploadDir)`. Best approach — save files under UUID only, keep original name in database.

2. **🔴 Add URL validation (backend + frontend)** — CV service accepts any `externalUrl` without checking scheme. Links go to `href` and `window.open()` without filtering on frontend. Add centralized validation allowing only `http:` / `https:` schemes.

3. **🔴 Fix refresh token contract** — backend returns `"token"`, frontend expects `"accessToken"`. Align names and consider adding interceptor which tries token refresh on 401 before redirecting to login.

4. **🔴 Move backend URL to environment variable** — `LoginPage.tsx` has hardcoded `http://localhost:8080`. Use `import.meta.env.VITE_API_URL` or dedicated `VITE_BACKEND_URL` variable.

5. **🔴 Add SameSite to refresh_token cookie** — in OAuth2 success handler explicitly set `SameSite=Lax` or `Strict` — don't rely on browser defaults.

6. **🔴 Add Error Boundary and fix CVManager crash** — one error (e.g., `new URL()` on invalid address) causes "white screen". Add global Error Boundary and wrap URL parsing in try/catch with fallback text.

### To Think About and Improve

7. **🟡 Unify stage update flow and history** — stage update method (from Kanban) doesn't create history entries. Stage addition method (with history save) isn't used by UI. Unify into one consistent flow that always updates history.

8. **🟡 Add @NotNull to status in StageUpdateRequest** — missing validation leads to 500 instead of readable 400. Consider also requiring rejectionReason when status is REJECTION.

9. **🟡 Add NOT NULL constraint on user_id** — Migration V4 adds column as nullable but never sets NOT NULL. Create new Flyway migration with backfill and constraint.

10. **🟡 Strengthen CV upload validation** — check magic bytes (PDF signature: `%PDF-`), don't just Content-Type.

11. **🟡 Split KanbanBoard.tsx** — extract KanbanCard, KanbanColumn, modals (StageModal, EndModal, MoveModal) and hook `useKanbanDragDrop` to separate files.

12. **🟡 Unify CVManager data fetching** — replace useState+useEffect with React Query hooks (you already have `useCV()`). Improves consistency and cache handling.

13. **🟡 Add pagination to `/api/applications`** — use Spring Data `Pageable`. Frontend can load page by page, gain performance with large datasets.

14. **🟡 Improve validation error response structure** — instead of concatenating errors into one string, return map `{field: message}` via `ProblemDetail.setProperty()`.

15. **🟡 Clean up @Transactional on private method** — annotation on `markCurrentStageCompleted()` is ignored by Spring AOP. Remove for clarity to show understanding of AOP.

16. **🟡 Extract status color constants** — move `STATUS_COLORS` to shared `constants/` file and import in both components.

### For Future Learning

17. **📘 Web application security** — study OWASP Top 10, Content Security Policy, path traversal, Subresource Integrity. Foundations for commercial work.

18. **📘 State Machine pattern** — for application status transitions. Read about Spring Statemachine or simpler enum implementations.

19. **📘 Testing** — tests of services exist (good foundation!). Check coverage with JaCoCo. Add tests for edge cases (null status, path traversal, invalid URLs). For frontend — use Testing Library.

20. **📘 Performance optimization** — read about React Profiler, memoization (`useMemo`), list virtualization (react-window/react-virtuoso), code splitting with React.lazy().

21. **📘 Backend caching** — Spring Cache with @Cacheable for badge statistics, Cache-Control headers in HTTP responses.

22. **📘 Monitoring and observability** — Micrometer with Spring Boot Actuator, distributed tracing, structured JSON logs.

---

## 💬 FINAL MOTIVATION

This project makes a real impression for someone at the beginning of programming journey. It's not just another "to-do list" — it's a full-stack application with OAuth2, JWT, database, Docker Compose, and gamification system. Architecture is well-thought-out, layer separation correct, technology choices sound.

Notes in this review aren't criticism — they're signposts for next level. Most "problems" are things even experienced programmers overlook. Fact that you use Flyway instead of `ddl-auto=update`, React Query instead of manual state management, httpOnly cookies instead of localStorage for refresh tokens — this shows you read good sources and make conscious architectural decisions.

Focus on 🔴 red-marked items — these are security and correctness issues worth fixing before sharing app. Rest are growth directions you'll naturally explore as you gain experience.

Good luck on your path to your first job in IT — with such a project in portfolio you have solid argument for job interviews! 💪

---

*Review Date: 2026-03-01*
