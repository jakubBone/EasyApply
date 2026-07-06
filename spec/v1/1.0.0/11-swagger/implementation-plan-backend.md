# Swagger Implementation Plan — Applikon Backend

## Work Process (applicable to each phase)

1. **Implementation** — Claude makes code changes
2. **Manual verification** — user opens `/swagger-ui.html` in browser (where noted)
3. **Update plans** — Claude updates checkboxes in this file
4. **Commit suggestion** — Claude proposes commit message (`type(backend): description`)
5. **Commit** — user runs `git add` + `git commit`
6. **Continue question** — Claude asks if we proceed to the next phase

---

## Goal

Add Swagger UI backed by OpenAPI 3 spec generated automatically from existing
code. Recruiters and developers can browse all endpoints, read request/response
shapes, and call authenticated endpoints directly from the UI using a JWT token.

---

## Design Decisions

- **`springdoc-openapi-starter-webmvc-ui` 2.8.x** — the version compatible with
  Spring Boot 3.4. No manual spec writing.
- **Swagger always enabled** — no prod/dev split. This is a portfolio project;
  visibility is the goal.
- **JWT Bearer scheme** — a single `Authorize` button in the UI accepts the
  access token returned by the login flow. Users paste it once, all subsequent
  calls include `Authorization: Bearer <token>`.
- **`@Tag` on controllers, `@Operation` only where non-obvious** — avoids
  annotation noise while still grouping endpoints clearly.
- **No `@Schema` on DTOs** — springdoc infers field names and types from
  the class automatically. Good enough for a portfolio.

---

## Implementation Status

### Phase 1 — Dependency + properties + security permit

**File 1:** `applikon-backend/pom.xml`

- [x] Add dependency inside `<dependencies>`:
  ```xml
  <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>2.8.8</version>
  </dependency>
  ```

**File 2:** `applikon-backend/src/main/resources/application.properties`

- [x] Add at the end:
  ```properties
  # Swagger / OpenAPI
  springdoc.swagger-ui.path=/swagger-ui.html
  springdoc.api-docs.path=/v3/api-docs
  springdoc.swagger-ui.operations-sorter=alpha
  springdoc.swagger-ui.tags-sorter=alpha
  ```

**File 3:** `applikon-backend/src/main/java/com/applikon/config/SecurityConfig.java`

- [x] Add Swagger paths to the public `requestMatchers` block (alongside `/privacy`, `/api/auth/**` etc.):
  ```java
  "/swagger-ui/**",
  "/swagger-ui.html",
  "/v3/api-docs/**"
  ```
- [x] Relax CSP to allow Swagger UI inline scripts/styles

**Verification:** `./mvnw spring-boot:run` → open `http://localhost:8080/swagger-ui.html` — UI loads, all endpoints visible.

---

### Phase 2 — Global API info + JWT security scheme

**File:** `applikon-backend/src/main/java/com/applikon/config/OpenApiConfig.java` *(new file)*

- [x] Create the config class:
  ```java
  @Configuration
  @OpenAPIDefinition(
      info = @Info(
          title = "Applikon API",
          description = "Job application tracker for IT candidates in Poland.",
          version = "1.0.0",
          contact = @Contact(name = "Jakub Bone", email = "jakub.bone1990@gmail.com")
      ),
      security = @SecurityRequirement(name = "bearerAuth")
  )
  @SecurityScheme(
      name = "bearerAuth",
      type = SecuritySchemeType.HTTP,
      scheme = "bearer",
      bearerFormat = "JWT"
  )
  public class OpenApiConfig {}
  ```

**Verification:** Swagger UI shows an "Authorize" button in the top-right corner.
Paste a valid access token → subsequent calls to authenticated endpoints return 200.

---

### Phase 3 — Controller annotations

Add `@Tag` to every controller and `@Operation` to non-obvious endpoints.

**File 1:** `controller/ApplicationController.java`

- [x] Add `@Tag(name = "Applications", description = "CRUD and duplicate detection for job applications")`

**File 2:** `controller/AuthController.java`

- [x] Add `@Tag(name = "Auth", description = "Google OAuth2 login, JWT refresh, consent, account management")`
- [x] `POST /api/auth/refresh` → `@Operation(summary = "Refresh access token using a valid refresh token")`
- [x] `POST /api/auth/consent` → `@Operation(summary = "Record user consent (required once after first login)")`
- [x] `DELETE /api/auth/me` → `@Operation(summary = "Permanently delete the authenticated user's account and all their data")`
- [x] `GET /api/auth/me/export` → `@Operation(summary = "Export all user data as JSON (RODO Art. 20)")`

**File 3:** `controller/AdminController.java`

- [x] Add `@Tag(name = "Admin", description = "Service notices management — requires X-Admin-Key header")`
- [x] `POST /api/admin/notices` → `@Operation(summary = "Create a service notice (BANNER or MODAL)", description = "Requires X-Admin-Key header. Active notices are shown to all logged-in users.")`

**File 4:** `controller/CVController.java`

- [x] Add `@Tag(name = "CV", description = "CV versions — link and note types")`

**File 5:** `controller/NoteController.java`

- [x] Add `@Tag(name = "Notes", description = "Notes per application — Questions, Feedback, Other")`

**File 6:** `controller/StatisticsController.java` *(not in original plan — added for completeness)*

- [x] Add `@Tag(name = "Statistics", description = "Badge stats and application metrics")`

**File 7:** `controller/SystemController.java` *(not in original plan — added for completeness)*

- [x] Add `@Tag(name = "System", description = "Active service notices shown to logged-in users")`

**Verification:** Swagger UI groups endpoints under named tags. Non-obvious endpoints have summaries.

---

## Verification

- [ ] `./mvnw test` — 0 failed (run once after all phases)

---

## Definition of Done (DoD)

- [ ] `/swagger-ui.html` loads and displays all controllers grouped by tag
- [ ] "Authorize" button accepts a JWT Bearer token
- [ ] Authenticated endpoint called from Swagger UI returns 200 (not 401)
- [ ] Swagger paths are not blocked by Spring Security
- [ ] `./mvnw test` — 0 failed
- [ ] `as-built.md` updated

---

## Out of Scope

- `@Schema` on DTOs — springdoc inference is sufficient
- `@ApiResponse` per endpoint — too verbose
- Disabling Swagger in production
- OpenAPI spec export as static file

---

## Files to Change

| File | Change |
|------|--------|
| `pom.xml` | Add springdoc dependency |
| `application.properties` | Add springdoc config |
| `config/SecurityConfig.java` | Permit Swagger paths + relax CSP |
| `config/OpenApiConfig.java` | New — API info + JWT security scheme |
| `controller/ApplicationController.java` | `@Tag` |
| `controller/AuthController.java` | `@Tag` + `@Operation` on 4 endpoints |
| `controller/AdminController.java` | `@Tag` + `@Operation` |
| `controller/CVController.java` | `@Tag` |
| `controller/NoteController.java` | `@Tag` |
| `controller/StatisticsController.java` | `@Tag` |
| `controller/SystemController.java` | `@Tag` |

---

*Created: 2026-05-06*
