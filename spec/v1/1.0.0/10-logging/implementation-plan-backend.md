# Logging Implementation Plan — Applikon Backend

## Work Process (applicable to each phase)

1. **Implementation** — Claude makes code changes
2. **Manual verification** — user checks log output in console (optional)
3. **Update plans** — Claude updates checkboxes in this file
4. **Commit suggestion** — Claude proposes commit message (format: `type(backend): description`)
5. **Commit** — user runs `git add` + `git commit`
6. **Continue question** — Claude asks if we proceed to the next phase

---

## Goal

Add targeted `WARN`-level logging to three specific gaps in the application
that are currently invisible in production: admin access denials, failed token
refreshes, and 404 errors. Remove two unused `Logger` field declarations.

No logging added in controllers or read-path operations — services already
cover key mutations and the MDC infrastructure (`MdcUserFilter`) automatically
adds `userId` to every log line.

---

## Design Decisions

- **No `@Slf4j` annotation** — project uses explicit `LoggerFactory.getLogger`
  declarations consistently (see `UserService`, `ApplicationService` etc.).
  Keep the same style.
- **`WARN` for security denials** — not `INFO`, because these are unexpected
  events in normal operation. `INFO` is for expected business events.
- **`WARN` for 404** — not `ERROR` (no crash) and not `DEBUG` (useful in prod).
- **IP in `AdminKeyFilter` log** — remote IP (`request.getRemoteAddr()`) is
  meaningful for security; not logged elsewhere because MDC already has userId.
- **Remove unused loggers, don't repurpose them** — `NoteService` and
  `JwtService` have no operations that warrant logging at this stage.
  Adding placeholder logs just to "use" the field would be noise.

---

## Implementation Status

### Phase 1 — `AdminKeyFilter`: warn on blocked admin access

**File:** `applikon-backend/src/main/java/com/applikon/security/AdminKeyFilter.java`

- [x] Add import: `org.slf4j.Logger`, `org.slf4j.LoggerFactory`
- [x] Add field: `private static final Logger log = LoggerFactory.getLogger(AdminKeyFilter.class);`
- [x] Add `log.warn` before `response.setStatus(SC_FORBIDDEN)`:
  ```java
  log.warn("Admin access denied: uri={}, ip={}", request.getRequestURI(), request.getRemoteAddr());
  ```

**Resulting behaviour:**
```
WARN  [anonymous] c.e.s.AdminKeyFilter - Admin access denied: uri=/api/admin/users, ip=1.2.3.4
```

---

### Phase 2 — `AuthController`: warn on failed token refresh

**File:** `applikon-backend/src/main/java/com/applikon/controller/AuthController.java`

- [x] Add import: `org.slf4j.Logger`, `org.slf4j.LoggerFactory`
- [x] Add field: `private static final Logger log = LoggerFactory.getLogger(AuthController.class);`
- [x] Add `log.warn` inside the existing `catch (Exception e)` block (line 88):
  ```java
  } catch (Exception e) {
      log.warn("Token refresh failed: {}", e.getMessage());
      return ResponseEntity.status(401).body(Map.of("error", ...));
  }
  ```

**Resulting behaviour:**
```
WARN  [anonymous] c.e.c.AuthController - Token refresh failed: Refresh token not found or expired
```

---

### Phase 3 — `GlobalExceptionHandler`: warn on 404

**File:** `applikon-backend/src/main/java/com/applikon/exception/GlobalExceptionHandler.java`

- [x] Add `log.warn` as first line inside `handleEntityNotFoundException`:
  ```java
  @ExceptionHandler(EntityNotFoundException.class)
  public ProblemDetail handleEntityNotFoundException(EntityNotFoundException ex) {
      log.warn("Entity not found: {}", ex.getMessage());
      ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
      ...
  }
  ```

**Resulting behaviour:**
```
WARN  [userId=abc123] c.e.e.GlobalExceptionHandler - Entity not found: Application with id=999 not found
```

---

### Phase 4 — Dead code cleanup: remove unused Logger fields

**File 1:** `applikon-backend/src/main/java/com/applikon/service/NoteService.java`

- [x] Remove line 23: `private static final Logger log = LoggerFactory.getLogger(NoteService.class);`
- [x] Remove imports: `org.slf4j.Logger`, `org.slf4j.LoggerFactory` (if no longer used)

**File 2:** `applikon-backend/src/main/java/com/applikon/security/JwtService.java`

- [x] Remove line 28: `private static final Logger log = LoggerFactory.getLogger(JwtService.class);`
- [x] Remove imports: `org.slf4j.Logger`, `org.slf4j.LoggerFactory`

---

## Verification

- [x] `./mvnw test` — 0 failed (run once after all phases)

---

## Definition of Done (DoD)

- [x] `AdminKeyFilter` produces `WARN` log with URI and IP on every blocked admin request
- [x] `AuthController.refresh()` produces `WARN` log with exception message on failure
- [x] `GlobalExceptionHandler.handleEntityNotFoundException` produces `WARN` log before returning 404
- [x] No unused `Logger` fields in `NoteService` or `JwtService`
- [x] `./mvnw test` — 0 failed
- [x] `as-built.md` updated: logging coverage section reflects changes

---

## Out of Scope

- **Controller logging for read operations** — too noisy; services cover mutations
- **`ConsentRequiredFilter` logging** — consent denials are expected flow; deferred
- **Structured JSON logging** — Logback pattern sufficient for v1
- **Log aggregation (ELK/Loki)** — post-v1
- **`JwtAuthenticationConverter`, `TokenHasher` logging** — no observable failure modes

---

## Files to Change

| File | Change |
|------|--------|
| `security/AdminKeyFilter.java` | Add logger + `log.warn` on 403 |
| `controller/AuthController.java` | Add logger + `log.warn` in catch block |
| `exception/GlobalExceptionHandler.java` | Add `log.warn` in 404 handler |
| `service/NoteService.java` | Remove unused Logger field + imports |
| `security/JwtService.java` | Remove unused Logger field + imports |

---

*Created: 2026-05-06*
