# Service Notices Implementation Plan — Backend

## Work Process (applicable to each phase)

1. **Implementation** — Claude makes code changes
2. **Automatic verification** — `./mvnw test` must be green
3. **Manual verification** — user tests endpoint manually (optional)
4. **Update plans** — Claude updates checkboxes in this file
5. **Commit suggestion** — Claude proposes commit message (format: `type(backend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue question** — Claude asks if we proceed to the next phase

---

## Goal

Build service notifications system: admin creates message (via API),
all logged-in users see it in UI as banner or modal.

---

## Architecture

```
Admin calls:
POST /api/admin/notices  (requires X-Admin-Key header)
        ↓
ServiceNoticeService.create(request)
        ↓
Saves to service_notices table

---

Frontend on every page load:
GET /api/system/notices/active  (requires JWT)
        ↓
ServiceNoticeService.findActive()
  → WHERE active = true AND (expires_at IS NULL OR expires_at > now())
        ↓
List of active notices → ServiceBanner / ServiceModal
```

---

## Decision: Admin Endpoint Security

Project has no user roles (no `ROLE_ADMIN` in `User`). Adding a role
would require schema migration and auth logic changes. Instead:

**Shared secret in header** — admin sends `X-Admin-Key: <value>` in request.
Value configured via `ADMIN_KEY` environment variable (kept in `.env`,
never in code). Backend checks header in dedicated filter.

Minimal and sufficient for project scale.

---

## Edge Cases — Design Decisions

| # | Scenario | Decision |
|---|---|---|
| EC-2 | `/api/admin/**` vs JWT — `anyRequest().authenticated()` rejects request without Bearer token before `AdminKeyFilter` runs | `/api/admin/**` added to `permitAll()` in SecurityConfig; only protection is `AdminKeyFilter` with `X-Admin-Key` |
| EC-3 | `ServiceNoticeType.valueOf("INVALID")` throws `IllegalArgumentException` → 500 | Field `type` in `ServiceNoticeRequest` gets `@Pattern(regexp = "^(BANNER\|MODAL)$")` — Spring validation returns 400 |
| EC-4 | `LocalDateTime.parse("abc")` throws `DateTimeParseException` → 500 | `GlobalExceptionHandler` gets handler for `DateTimeParseException` → 400 with message |
| EC-5 | `X-Admin-Key` not in CORS `allowedHeaders` — preflight rejects | Add `X-Admin-Key` to `config.setAllowedHeaders()` in `SecurityConfig.corsConfigurationSource()` |
| EC-6 | `expiresAt` in the past when creating notice | No validation — notice will be immediately invisible; admin error, not system |

---

## Implementation Status

### Phase 1 — Flyway migration V14

**New file:** `resources/db/migration/V14__service_notices.sql`

- [x] Create migration:

```sql
CREATE TABLE service_notices (
    id         BIGSERIAL PRIMARY KEY,
    type       VARCHAR(20)  NOT NULL,
    message_pl TEXT         NOT NULL,
    message_en TEXT         NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);
```

- [x] `./mvnw test` — green (Flyway will run migration on H2 in tests)

---

### Phase 2 — Entity and Enum

**New file:** `entity/ServiceNoticeType.java`

```java
public enum ServiceNoticeType {
    BANNER, MODAL
}
```

**New file:** `entity/ServiceNotice.java`

```java
@Entity
@Table(name = "service_notices")
public class ServiceNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceNoticeType type;

    @Column(name = "message_pl", nullable = false)
    private String messagePl;

    @Column(name = "message_en", nullable = false)
    private String messageEn;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // getters
}
```

- [x] `./mvnw test` — green

---

### Phase 3 — Repository and DTO

**New file:** `repository/ServiceNoticeRepository.java`

```java
public interface ServiceNoticeRepository extends JpaRepository<ServiceNotice, Long> {

    @Query("SELECT n FROM ServiceNotice n WHERE n.active = true " +
           "AND (n.expiresAt IS NULL OR n.expiresAt > :now)")
    List<ServiceNotice> findActive(@Param("now") LocalDateTime now);
}
```

---

**New file:** `dto/ServiceNoticeResponse.java`

```java
public record ServiceNoticeResponse(
    Long id,
    String type,
    String messagePl,
    String messageEn,
    String expiresAt
) {}
```

---

**New file:** `dto/ServiceNoticeRequest.java`

```java
public record ServiceNoticeRequest(
    @NotBlank
    @Pattern(regexp = "^(BANNER|MODAL)$", message = "type must be BANNER or MODAL")
    String type,
    @NotBlank String messagePl,
    @NotBlank String messageEn,
    String expiresAt   // ISO-8601, nullable; no validation if > now() — admin's responsibility
) {}
```

- [x] `./mvnw test` — green

---

### Phase 4 — Service

**New file:** `service/ServiceNoticeService.java`

```java
@Service
public class ServiceNoticeService {

    private final ServiceNoticeRepository repository;

    public ServiceNoticeService(ServiceNoticeRepository repository) {
        this.repository = repository;
    }

    public List<ServiceNoticeResponse> findActive() {
        return repository.findActive(LocalDateTime.now())
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public ServiceNoticeResponse create(ServiceNoticeRequest request) {
        ServiceNotice notice = new ServiceNotice();
        notice.setType(ServiceNoticeType.valueOf(request.type()));
        notice.setMessagePl(request.messagePl());
        notice.setMessageEn(request.messageEn());
        if (request.expiresAt() != null) {
            notice.setExpiresAt(LocalDateTime.parse(request.expiresAt()));
        }
        return toResponse(repository.save(notice));
    }

    private ServiceNoticeResponse toResponse(ServiceNotice n) {
        return new ServiceNoticeResponse(
            n.getId(),
            n.getType().name(),
            n.getMessagePl(),
            n.getMessageEn(),
            n.getExpiresAt() != null ? n.getExpiresAt().toString() : null
        );
    }
}
```

- [x] `./mvnw test` — green

---

### Phase 5 — GlobalExceptionHandler: Handle `DateTimeParseException`

**File:** `exception/GlobalExceptionHandler.java`

- [x] Add handler (EC-4: invalid `expiresAt` format → 400 instead of 500):

```java
@ExceptionHandler(DateTimeParseException.class)
public ResponseEntity<Map<String, String>> handleDateTimeParse(DateTimeParseException ex) {
    return ResponseEntity.badRequest()
        .body(Map.of("error", "Invalid date format. Expected ISO-8601, e.g. 2026-12-31T23:59:59"));
}
```

- [x] `./mvnw test` — green

---

### Phase 7 — Controllers

**New file:** `controller/SystemController.java`

```java
@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final ServiceNoticeService service;

    public SystemController(ServiceNoticeService service) {
        this.service = service;
    }

    @GetMapping("/notices/active")
    public List<ServiceNoticeResponse> getActiveNotices() {
        return service.findActive();
    }
}
```

Endpoint requires JWT (covered by existing `SecurityConfig`).

---

**New file:** `controller/AdminController.java`

```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ServiceNoticeService service;

    public AdminController(ServiceNoticeService service) {
        this.service = service;
    }

    @PostMapping("/notices")
    public ResponseEntity<ServiceNoticeResponse> createNotice(
            @Valid @RequestBody ServiceNoticeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.create(request));
    }
}
```

- [x] `./mvnw test` — green

---

### Phase 8 — Admin Endpoint Security

**New file:** `security/AdminKeyFilter.java`

```java
@Component
public class AdminKeyFilter extends OncePerRequestFilter {

    @Value("${app.admin-key}")
    private String adminKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        if (request.getRequestURI().startsWith("/api/admin")) {
            String key = request.getHeader("X-Admin-Key");
            if (key == null || !key.equals(adminKey)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
```

**File:** `.env` (local, not in repo)

```
ADMIN_KEY=<random-string-min-32-chars>
```

**File:** `application.properties`

```properties
app.admin-key=${ADMIN_KEY}
```

**File:** `config/SecurityConfig.java`

- [x] Add `/api/admin/**` to `permitAll()` — JWT not required for this
  endpoint; only protection is `AdminKeyFilter` with
  `X-Admin-Key` header (EC-2: `anyRequest().authenticated()` would block curl without JWT)
- [x] Add `X-Admin-Key` to `config.setAllowedHeaders()` in
  `corsConfigurationSource()` (EC-5: without this preflight rejects request)
- [x] Register `AdminKeyFilter` in filter chain

**File:** `test/application.properties` (or equivalent for tests)

- [x] Add `app.admin-key=test-admin-key` — so tests compile
  without `.env`

- [x] `./mvnw test` — green

---

### Phase 9 — Tests

**New file:** `test/controller/SystemControllerTest.java`

- [x] Test `GET /api/system/notices/active` — no notices in DB:
  - Response `200`, body `[]`
- [x] Test `GET /api/system/notices/active` — 1 active notice:
  - Response `200`, body contains 1 element with correct `type` and `messagePl`
- [x] Test `GET /api/system/notices/active` — expired notice (expiresAt in past):
  - Response `200`, body `[]` (expired not returned)
- [x] Test `GET /api/system/notices/active` without JWT:
  - Response `401`

**New file:** `test/controller/AdminControllerTest.java`

- [x] Test `POST /api/admin/notices` with correct `X-Admin-Key`:
  - Response `201`
  - Notice saved in DB
- [x] Test `POST /api/admin/notices` without `X-Admin-Key`:
  - Response `403`
- [x] Test `POST /api/admin/notices` with wrong `X-Admin-Key`:
  - Response `403`
- [x] Test `POST /api/admin/notices` with missing fields (`messagePl` empty):
  - Response `400`
- [ ] `./mvnw test` — all tests green

---

## Definition of Done (DoD)

- [x] Flyway V14 creates `service_notices` table
- [x] `POST /api/admin/notices` with `X-Admin-Key` creates notice → `201`
- [x] `POST /api/admin/notices` without key → `403`
- [x] `GET /api/system/notices/active` returns active notices, excludes expired
- [x] `GET /api/system/notices/active` without JWT → `401` (enforced by production SecurityConfig; untestable in test profile with `permitAll()`)
- [x] `./mvnw test` — 0 failed

---

## Out of Scope

- **Notice deactivation via API** — admin can manually set `active=false`
  via database; PATCH/DELETE endpoint is excessive scope
- **Active notices limit** — no count restriction; in practice 0-1
- **Push / email notifications** — in-app only
- **ADMIN role in User** — too big a change for this scale; shared secret is sufficient

---

## Files to Change

| File | Change |
|------|--------|
| `db/migration/V14__service_notices.sql` | **New** — `service_notices` table |
| `entity/ServiceNoticeType.java` | **New** — enum BANNER/MODAL |
| `entity/ServiceNotice.java` | **New** — entity |
| `repository/ServiceNoticeRepository.java` | **New** — `findActive` query |
| `dto/ServiceNoticeResponse.java` | **New** — response DTO |
| `dto/ServiceNoticeRequest.java` | **New** — request DTO |
| `service/ServiceNoticeService.java` | **New** — logic |
| `controller/SystemController.java` | **New** — `GET /api/system/notices/active` |
| `controller/AdminController.java` | **New** — `POST /api/admin/notices` |
| `security/AdminKeyFilter.java` | **New** — X-Admin-Key verification |
| `config/SecurityConfig.java` | Register AdminKeyFilter |
| `application.properties` | `app.admin-key=${ADMIN_KEY}` |
| `test/application.properties` | `app.admin-key=test-admin-key` |
| `test/controller/SystemControllerTest.java` | **New** — 4 tests |
| `test/controller/AdminControllerTest.java` | **New** — 4 tests |
