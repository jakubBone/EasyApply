# Applikon — Phase 10: Logging (production observability)

## 1. Context

The application is being prepared for public deployment on a Hetzner VPS
running Docker Compose. After deployment, there is no IDE, no debugger,
and no interactive console — **logs are the only diagnostic tool available**.

The existing logging setup has a solid foundation: MDC integration
(`MdcUserFilter` adds `userId` to every log line automatically), Logback
configured with a custom pattern, and key business operations already logged
in services. However, three specific gaps make the application partially
blind in production — especially around security events and error handling.

---

## 2. Problem

### 2.1 Silent security boundary (`AdminKeyFilter`)

`AdminKeyFilter` blocks requests to `/api/admin/**` without a valid
`X-Admin-Key` header and returns `403 Forbidden` silently. No log is produced.
In production this means:

- Brute-force probing of the admin key leaves zero trace.
- If the filter malfunctions (e.g. wrong env variable), the failure is
  indistinguishable from "filter works correctly, key is wrong".

### 2.2 Silent auth failure (`AuthController.refresh`)

The `POST /api/auth/refresh` endpoint wraps token validation in a try-catch
block (lines 84–91) that returns `401` but never logs the exception. In
production this means:

- A failed refresh (expired token, tampered payload, DB error, code bug)
  is completely invisible.
- Impossible to distinguish user error from infrastructure failure.

### 2.3 Silent 404 errors (`GlobalExceptionHandler`)

`handleEntityNotFoundException` returns `404 Not Found` for every
`EntityNotFoundException` — but logs nothing (lines 57–61). In production
this means:

- Frontend calling a wrong or stale ID produces a silent 404 with no
  server-side trace.
- Hard to tell whether a 404 is an expected "resource gone" or an
  unexpected "ID from a bug".

### 2.4 Dead logger fields

`NoteService` (line 23) and `JwtService` (line 28) each declare a
`private static final Logger log` field that is never used anywhere in
the class. Dead code misleads: a reader assumes something is logged when
nothing is.

---

## 3. Decision

**Log at the "something went wrong" boundary — not at every operation.**

Specifically:
- `WARN` for security denials (AdminKeyFilter, failed token refresh) — these
  are unexpected and warrant attention.
- `WARN` for 404 errors — not a crash, but useful signal.
- Remove the two unused `Logger` fields — no placeholder logging.

**What we do NOT add:**
- Request-level logging in controllers — services already log key mutations.
  Adding controller logs would duplicate entries and increase noise.
- Access logging for read endpoints (`GET /me`, `GET /applications`, etc.) —
  low signal-to-noise in production.
- Centralized log aggregation (ELK, Grafana Loki) — out of scope for v1.

The existing MDC infrastructure (`MdcUserFilter`) already injects `userId`
into every log line — no additional MDC setup needed.

---

## 4. Scope

Single thread: **`logging/`** — backend only (no frontend changes required).

### 4.1 Security visibility

- `AdminKeyFilter`: log `WARN` on every blocked request (URI + remote IP).

### 4.2 Auth visibility

- `AuthController.refresh()`: log `WARN` in the catch block with
  the exception message.

### 4.3 Error handler coverage

- `GlobalExceptionHandler.handleEntityNotFoundException`: add `log.warn`
  with the exception message before returning the `ProblemDetail`.

### 4.4 Dead code cleanup

- `NoteService`: remove the unused `Logger` field.
- `JwtService`: remove the unused `Logger` field.

---

## 5. Out of Scope

- **Controller-level request logging** — too noisy, services cover mutations.
- **Logging for `ConsentRequiredFilter`** — consent denials are expected
  behaviour in the OAuth flow; `debug` logging at best, deferred.
- **Structured JSON logs** — Logback pattern is sufficient for v1.
- **Log rotation / retention policy** — handled by Docker logging driver
  and host OS, not application config.
- **Centralized log aggregation** — post-v1.
- **Logging in `JwtAuthenticationConverter`, `TokenHasher`** — utility
  classes with no observable failure modes worth logging.

---

## 6. Success Criteria (Definition of Done for phase)

Phase 10 is closed when:

1. ✅ A request to `/api/admin/**` with a wrong or missing key produces a
   `WARN` log line containing URI and remote IP.
2. ✅ A failed `POST /api/auth/refresh` (invalid/expired token) produces a
   `WARN` log line containing the exception message.
3. ✅ An `EntityNotFoundException` produces a `WARN` log line before the
   `404` response is returned.
4. ✅ No unused `Logger` fields remain in the codebase.
5. ✅ `./mvnw test` — all tests pass, zero failures.
6. ✅ `as-built.md` updated: logging coverage section.

---

## 7. Implementation Order

Single thread, phases executed in order:

1. **Phase 1** — `AdminKeyFilter`: security warn (most critical before deploy)
2. **Phase 2** — `AuthController.refresh()`: catch block warn
3. **Phase 3** — `GlobalExceptionHandler`: 404 warn
4. **Phase 4** — Dead code cleanup: remove unused loggers

---

## 8. Related Documents

- `spec/v1/as-built.md` — update after completion (logging coverage section)
- `spec/v1/1.0.0/10-logging/implementation-plan-backend.md` — detailed implementation plan
- `spec/README.md` — add row for phase 10

---

*Created: 2026-05-06*
