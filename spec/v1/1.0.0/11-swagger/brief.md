# Applikon — Phase 11: Swagger / OpenAPI

## 1. Context

The application is being prepared for public deployment and GitHub publication.
Developers visiting the repository have no way to browse the API
without running the application locally. A living API documentation that is
accessible on the production URL adds credibility and makes the project easier
to evaluate.

Spring Boot 3.4 integrates cleanly with `springdoc-openapi` 2.x — no manual
spec writing required. The library generates an OpenAPI 3 spec from existing
code and serves Swagger UI automatically.

---

## 2. Problem

- No API documentation exists. Endpoints, request bodies, and response shapes
  are only discoverable by reading the source code.
- For a portfolio project, this is a missed signal: Swagger UI at a live URL
  shows the full API at a glance — including auth, CRUD, admin endpoints.
- Without a security scheme configured, authenticated endpoints cannot be
  tested from Swagger UI (every call returns 401).

---

## 3. Decision

Add `springdoc-openapi-starter-webmvc-ui` and configure it with:
- Global API metadata (title, description, version, contact)
- JWT Bearer security scheme so authenticated endpoints can be called from the UI
- `@Tag` on each controller to group endpoints by domain
- `@Operation` on non-obvious endpoints (auth flow, admin, export)
- Swagger UI publicly accessible — this is a portfolio project, visibility is the point

**What we do NOT add:**
- `@Schema` annotations on every DTO — generated defaults are readable enough
- `@ApiResponse` on every endpoint — too verbose for the value it adds
- Separate Swagger config per profile — one config, always enabled

---

## 4. Scope

Backend only. No frontend changes.

### 4.1 Dependency + base config
- Add `springdoc-openapi-starter-webmvc-ui` to `pom.xml`
- Configure `springdoc.*` properties in `application.properties`

### 4.2 Security — permit Swagger paths
- `SecurityConfig`: add `/swagger-ui/**` and `/v3/api-docs/**` to public paths

### 4.3 Global API info
- `@OpenAPIDefinition` on main class or dedicated `OpenApiConfig`:
  title, description, version, contact email

### 4.4 JWT security scheme
- `@SecurityScheme` — Bearer token so Swagger UI shows "Authorize" button
- `@SecurityRequirement` on controllers that require auth

### 4.5 Controller annotations
- `@Tag` on every controller (groups endpoints in the UI)
- `@Operation` on endpoints with non-obvious purpose:
  `POST /api/auth/refresh`, `POST /api/auth/consent`, `DELETE /api/auth/me`,
  `GET /api/auth/me/export`, `POST /api/admin/notices`

---

## 5. Out of Scope

- `@Schema` on DTOs — auto-generated schema is sufficient
- `@ApiResponse` on every endpoint — too much annotation noise
- Disabling Swagger in prod — counterproductive for a portfolio project
- OpenAPI spec export as a static file — live UI is enough

---

## 6. Success Criteria (Definition of Done)

Phase 11 is closed when:

1. ✅ `/swagger-ui.html` loads and shows all controllers grouped by tag
2. ✅ "Authorize" button accepts a JWT Bearer token
3. ✅ Authenticated endpoints (e.g. `GET /api/applications`) return 200 when
   called from Swagger UI with a valid token
4. ✅ Swagger paths are not blocked by Spring Security
5. ✅ `./mvnw test` — all tests pass, zero failures
6. ✅ `as-built.md` updated

---

## 7. Implementation Order

1. **Phase 1** — dependency + properties + security permit
2. **Phase 2** — global API info + JWT security scheme
3. **Phase 3** — controller `@Tag` and `@Operation` annotations

---

## 8. Related Documents

- `spec/v1/as-built.md` — update after completion
- `spec/v1/1.0.0/11-swagger/implementation-plan-backend.md` — detailed plan
- `spec/README.md` — add row for phase 11

---

*Created: 2026-05-06*
