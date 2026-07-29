# 1.0.0 10-logging — Implementation Plan (backend)

## What changes

| File | Change |
|------|--------|
| `security/AdminKeyFilter.java` | Add a logger and `log.warn` on 403 |
| `controller/AuthController.java` | Add a logger and `log.warn` in the catch block |
| `exception/GlobalExceptionHandler.java` | Add `log.warn` in the 404 handler |
| `service/NoteService.java` | Remove the unused Logger field and its imports |
| `security/JwtService.java` | Remove the unused Logger field and its imports |

**Design decisions**

- **No `@Slf4j`.** The project declares loggers explicitly with
  `LoggerFactory.getLogger`, as in `UserService` and `ApplicationService`. Keep
  that style.
- **`WARN` for security denials, not `INFO`.** These are unexpected in normal
  operation, and `INFO` is for expected business events.
- **`WARN` for 404**, not `ERROR` because nothing crashed, and not `DEBUG`
  because it is useful in production.
- **The remote IP goes in the `AdminKeyFilter` line.** It is meaningful for
  security. It is not logged elsewhere, because MDC already carries `userId`.
- **Unused loggers are removed, not repurposed.** `NoteService` and `JwtService`
  have nothing worth logging at this stage, and a placeholder log added just to
  use the field would be noise.

## Step 1 — `AdminKeyFilter`: warn on blocked admin access

**File:** `applikon-backend/src/main/java/com/applikon/security/AdminKeyFilter.java`

**Build** — add the `Logger` and `LoggerFactory` imports, the
`private static final Logger log` field, and a warning before
`response.setStatus(SC_FORBIDDEN)`:

```java
log.warn("Admin access denied: uri={}, ip={}", request.getRequestURI(), request.getRemoteAddr());
```

**Done when** a blocked request produces:

```
WARN  [anonymous] c.e.s.AdminKeyFilter - Admin access denied: uri=/api/admin/users, ip=1.2.3.4
```

**Checklist**
- [x] Imports and the `log` field added
- [x] `log.warn` with URI and remote IP before the 403

## Step 2 — `AuthController`: warn on a failed token refresh

**File:** `applikon-backend/src/main/java/com/applikon/controller/AuthController.java`

**Build** — add the imports and the `log` field, then log inside the existing
`catch`:

```java
} catch (Exception e) {
    log.warn("Token refresh failed: {}", e.getMessage());
    return ResponseEntity.status(401).body(Map.of("error", ...));
}
```

**Done when** a failed refresh produces:

```
WARN  [anonymous] c.e.c.AuthController - Token refresh failed: Refresh token not found or expired
```

**Checklist**
- [x] Imports and the `log` field added
- [x] `log.warn` with the exception message inside the catch block

## Step 3 — `GlobalExceptionHandler`: warn on 404

**File:** `applikon-backend/src/main/java/com/applikon/exception/GlobalExceptionHandler.java`

**Build** — log as the first line of `handleEntityNotFoundException`:

```java
@ExceptionHandler(EntityNotFoundException.class)
public ProblemDetail handleEntityNotFoundException(EntityNotFoundException ex) {
    log.warn("Entity not found: {}", ex.getMessage());
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    ...
}
```

**Done when** a 404 produces:

```
WARN  [userId=abc123] c.e.e.GlobalExceptionHandler - Entity not found: Application with id=999 not found
```

**Checklist**
- [x] `log.warn` added before the `ProblemDetail` is built

## Step 4 — Remove the dead Logger fields

**Build**
- `service/NoteService.java` — remove the `log` field and the `Logger` and
  `LoggerFactory` imports.
- `security/JwtService.java` — remove the same.

**Done when** neither class declares a logger it does not use, and `./mvnw test`
is green.

**Checklist**
- [x] `NoteService`: field and imports removed
- [x] `JwtService`: field and imports removed
- [x] `./mvnw test` green, run once after all four steps
