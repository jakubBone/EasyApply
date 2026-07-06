# Backend Learning Notes — Applikon

Reference file for learning progress. Each phase = key concepts, important files, fixed code reviews.

---

## Phase 1 — Architecture Overview, Security, OAuth2, JWT

### Request → Response Flow

Example: `POST /api/applications`

```
HTTP POST /api/applications  (+ Authorization: Bearer <JWT> header)
  ↓
[CORS filter]                → is frontend origin in allowedOrigins list?
[OAuth2 Resource Server]     → extracts JWT from header
                               → JwtDecoder verifies signature and exp
                               → JwtAuthenticationConverter: JWT → AuthenticatedUser
                               → SecurityContext.setAuthentication(...)
[Authorization filter]       → .anyRequest().authenticated() — has token? OK.
[MdcUserFilter]              → extracts userId from SecurityContext, puts into logs
  ↓
ApplicationController.create()
  → @AuthenticationPrincipal AuthenticatedUser user  (from SecurityContext)
  → @Valid @RequestBody ApplicationRequest           (DTO validation before method)
  ↓
ApplicationService.create()  (@Transactional)
  → userRepository.findById()
  → new Application(...)
  → applicationRepository.save()     ↑
  → stageHistoryRepository.save()    ↑  one rollback if anything fails
  ↓
ApplicationResponse (DTO) → JSON → 201 Created
```

If JWT is invalid or missing → Spring Security returns **401**, controller method is not invoked.

---

### Layers — What Each Does

| Layer | Responsibility | Does NOT Do |
|---------|-----------------|-------------|
| Controller | HTTP: parses, invokes service, builds response | business logic |
| Service | business logic, transactions, rules | direct DB access |
| Repository | SQL/JPA, database access | any logic |
| Entity | data model (table) | business logic |
| DTO | contract with frontend | doesn't go to database |

---

### CORS — What It Is and Why

The browser blocks requests between different origins (protocol + domain + port).
`localhost:5173` → `localhost:8080` = two origins → browser asks backend (preflight OPTIONS).

Backend responds: "this origin is OK" → browser allows request.

```java
// SecurityConfig.java
config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
config.setAllowCredentials(true);  // without this cookies won't be sent with request
```

`allowedOrigins` comes from `application.properties` (environment variable).
CORS applies **only to browsers** — curl/Postman don't check it.

---

### HTTP Sessions vs JWT (Stateless)

**Session (old approach):**
- Server creates a session and remembers user in memory
- Browser gets cookie `JSESSIONID`
- On each request server looks up session in memory
- Problem: server must remember every logged-in user — with many servers you need synchronization

**JWT (stateless — your approach):**
- Server remembers nothing
- Entire "session" is in the token (JWT) on client side
- On each request server verifies token signature — information is inside
- Works on many servers without synchronization

`SessionCreationPolicy.STATELESS` = Spring doesn't create HttpSession.

---

### Cryptography — Keys and Signatures (Simplified)

**RSA = key pair:**
- **Private** — only server has it, signs tokens
- **Public** — you can give to everyone, verifies signature is real

**Signature** = mathematical operation:
```
signature = encrypt(hash(data), private_key)
verification: hash(data) == decrypt(signature, public_key)  → OK
```

No one can forge signature without private key — even knowing public key.

**In project:**
Key generated at startup in memory (`RSAKeyGenerator(2048)`).
After restart old tokens are invalid — OK, because access token lives only 15 min.

---

### JWT — Structure

```
HEADER.PAYLOAD.SIGNATURE
```

Each part is Base64 — anyone can decode it. JWT is not encrypted, just signed.

**HEADER:**
```json
{ "alg": "RS256", "kid": "applikon-key" }
```

**PAYLOAD (claims):**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  ← userId
  "email": "jakub@gmail.com",
  "name": "Jakub",
  "iat": 1711900000,   ← issued at (when issued)
  "exp": 1711900900    ← expiration (when expires)
}
```

**SIGNATURE:** `RSA_sign(HEADER + "." + PAYLOAD, private_key)`

**Claims** = fields in PAYLOAD. Standard: `sub`, `iat`, `exp`. Custom: `email`, `name`.
Don't put passwords or secrets in JWT — payload is public.

---

### JWK — What Is It

JWK = JSON Web Key. Cryptographic key in JSON format.
JWKSet = set of keys (useful for rotation).
JWKSource = interface "key vault" — Nimbus asks it for key to sign/verify.

---

### `Jwt` Class from Spring Security

Ready-made class with API (`org.springframework.security.oauth2.jwt`). Holds decoded token:

```java
jwt.getSubject()              // claims["sub"]
jwt.getClaimAsString("email") // claims["email"]
jwt.getExpiresAt()            // claims["exp"]
```

Spring Security decodes token string → `Jwt` object → passes to your converter.

---

### UUID — What Is It and Why

UUID = 128-bit random identifier: `550e8400-e29b-41d4-a716-446655440000`

Why not `Long id`?
- `Long` is sequential (1, 2, 3...) → attacker can guess other users' IDs
- UUID is random → not guessable

In project: `User.id` is UUID, generated by database at INSERT. Lands in JWT as `sub`.

---

### Principal — What Is It

Principal = "who is logged in". General concept from Java and Spring Security.

In Spring Security `Authentication` holds:
- `principal` → who (yours: `AuthenticatedUser`)
- `credentials` → proof (JWT string, usually null after verification)
- `authorities` → permissions / roles (yours: empty)

`@AuthenticationPrincipal` = annotation that extracts `authentication.getPrincipal()` and injects into method parameter.

---

### Chain: JWT string → AuthenticatedUser in Controller

```
JWT string in header (Authorization: Bearer ...)
    ↓
JwtDecoder.decode()              [Spring Security, automatic]
    → verifies signature and exp
    → returns Jwt object (with claims)
    ↓
JwtAuthenticationConverter.convert(Jwt jwt)    [Your code]
    → extracts sub, email, name from claims
    → creates new AuthenticatedUser(userId, email, name)
    → returns AuthenticatedUserToken (principal = AuthenticatedUser)
    ↓
SecurityContextHolder.setAuthentication(...)   [Spring Security]
    ↓
MdcUserFilter.doFilterInternal()               [Your code]
    → SecurityContextHolder.getAuthentication().getPrincipal()
    → MDC.put("userId", user.id())     ← every log gets userId
    → filterChain.doFilter(...)
    → finally: MDC.remove("userId")    ← CRITICAL: thread returns to pool
    ↓
@AuthenticationPrincipal AuthenticatedUser user  [in controller]
```

**Written by you:**
- `JwtAuthenticationConverter.java` — JWT → AuthenticatedUser conversion
- `AuthenticatedUser.java` — record (id, email, name)
- `MdcUserFilter.java` — putting userId into logs
- `SecurityConfig.java` — configuration (what's public, CORS, which decoder)

**Provided by Spring Security / Nimbus (ready from API):**
- `JwtDecoder`, `JwtEncoder` — implementations (NimbusJwtDecoder/Encoder)
- Entire filter chain — CORS, session, authorization
- `@AuthenticationPrincipal` — injecting principal into method
- `Jwt` — class with claims

---

### OAuth2 — Login Flow

```
1. Frontend → redirects to Google
   (Spring Security generates URL automatically)

2. Google → login screen (you don't do this)
   User types password at Google, not at you

3. Google → redirects back to:
   /login/oauth2/code/google?code=ONE_TIME_CODE

4. Spring Security receives code → exchanges for token at Google (server-to-server)
   Google returns: { id_token: "...", access_token: "..." }

5. Spring Security extracts user data from id_token
   → calls CustomOAuth2UserService  [Your code]
      searches for user in database by googleId
      if missing → creates new User
      if exists → updates email/name

6. OAuth2AuthenticationSuccessHandler  [Your code]
   → generates access token (JWT, RS256, 15 min)
   → generates refresh token (JWT, RS256, 7 days)
   → sets refresh token as httpOnly cookie
   → redirects frontend with access token
```

**What You Write vs What Framework Provides:**

| What | Who |
|----|---------|
| Redirect to Google | Spring Security automatic |
| Login screen | Google |
| Code → token exchange | Spring Security automatic |
| Creating/updating User in database | You → `CustomOAuth2UserService` |
| Generating Your JWT | You → `OAuth2AuthenticationSuccessHandler` |
| Verifying JWT on every request | Spring Security automatic |

**OAuth2 Terminology:**

| Term | What It Is |
|--------|-------|
| Client | Your application (Applikon) |
| Resource Owner | User (Google account owner) |
| Authorization Server | Google — issues tokens |
| Resource Server | Your backend — protects API |
| Authorization Code | One-time code from redirect |
| scope | What data you want from Google (`email`, `profile`) |
| redirect_uri | Where Google redirects after login |

**Why code, not token directly?**
Code → token exchange happens server-to-server (with `client_secret`). No intermediary on network sees Google's token.

---

### SecurityConfig — What You Create, What's Ready

| Bean | What It Does | Who Implements |
|------|---------|-----------------|
| `rsaKey()` | generates RSA 2048-bit key pair | Nimbus (library) |
| `jwkSource()` | wraps key in "vault" | Nimbus |
| `jwtEncoder()` | creates/signs JWT | Nimbus (NimbusJwtEncoder) |
| `jwtDecoder()` | verifies JWT, returns Jwt | Nimbus (NimbusJwtDecoder) |
| `securityFilterChain()` | configures security rules | You configure, Spring builds |
| `corsConfigurationSource()` | CORS rules | You configure, Spring applies |

---

---

## Phase 2 — Security: OAuth2, JWT, Cookies

### Access Token vs Refresh Token — Flow

```
Login via Google
  → access token  → URL (/auth/callback?token=...) → frontend holds in JS memory
  → refresh token → httpOnly cookie (browser holds itself)
  → refresh token → database (server holds copy for verification)

Request after 5 minutes:
  → frontend sends: Authorization: Bearer <access_token>
  → refresh token NOT sent (cookie only goes to /api/auth)
  → works ✅

Request after 20 minutes (access token expired):
  → frontend sends access token → backend returns 401
  → frontend calls POST /api/auth/refresh
  → browser automatically includes httpOnly cookie with refresh token
  → backend: userService.findByValidRefreshToken(token) — searches database
  → finds and not expired → generates new access token
  → frontend gets new access token → holds in JS memory
  → retries original request ✅
```

### Why Refresh Token Is UUID, Not JWT

JWT is **stateless** — server remembers nothing, just verifies signature.
To revoke JWT you need a blacklist — complicated.

Refresh token as UUID is **saved in database**. Revocation = deletion from database.
Logout: `userService.clearRefreshToken(user)` + cookie `MaxAge=0`.

### localStorage vs httpOnly Cookie

| | localStorage | httpOnly Cookie |
|--|-------------|-----------------|
| JavaScript can read | yes | no (`document.cookie` returns "") |
| Sending to server | manually in header | browser automatic |
| Vulnerability to XSS | yes | no |

Access token in JS memory can be stolen by XSS — but lives only 15 min.
React by default protects against XSS (escapes HTML in JSX).

### CSRF and SameSite

**CSRF** = attacker tricks browser into sending request to your domain on your behalf (browser includes cookies automatically).

**SameSite=Strict** — browser won't send cookie when request is from foreign site. Attack impossible.

Minus Strict: clicking external link to app → no cookie on first request → appears logged out (one-time hiccup, OK after refresh).
That's why many apps use `Lax` — links work, automatic POSTs from foreign sites blocked.

### JwtService — How Access Token Is Created

```java
JwtClaimsSet claims = JwtClaimsSet.builder()
        .subject(user.getId().toString())            // user UUID
        .claim("email", user.getEmail())
        .claim("name", user.getName())
        .expiresAt(now.plus(15, ChronoUnit.MINUTES))
        .build();
jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
// jwtEncoder signs with RSA private key → string "aaa.bbb.ccc"
```

### CR-3 and CR-5 — Fixed Before Session

**CR-3** — backend returned `"token"` instead of `"accessToken"`.
Frontend did `const { accessToken } = response` → `undefined` — silent bug, user logged out after 15 min.
Fixed: `Map.of("accessToken", newAccessToken)` in `AuthController.java:72`.

**CR-5** — missing `SameSite` on cookie → CSRF vulnerability.
Fixed: `refreshCookie.setAttribute("SameSite", "Strict")` in `OAuth2AuthenticationSuccessHandler.java:80`.

### Key Files for This Phase

| File | What It Does |
|------|---------|
| `JwtService.java` | Generates access token (JWT) and refresh token (UUID) |
| `OAuth2AuthenticationSuccessHandler.java` | After login: generates tokens, sets cookie, redirect |
| `AuthController.java` | `/refresh` — verifies refresh token, issues new access token; `/logout` — clears |

---

## Phase 3 — Security: Data Validation and Files

### CR-1 — Path Traversal

`file.getOriginalFilename()` returns name provided by client — attacker can enter `/etc/passwd` or `../../etc/cron.d/backdoor`.

`Path.resolve()` with absolute path ignores `uploadDir` and saves file where attacker wants.

**Fix:** Only `UUID.randomUUID() + ".pdf"` goes to disk. Original filename is already in database (`originalFileName`), doesn't need to be in file path.

```java
// BEFORE (vulnerability)
String fileName = UUID.randomUUID() + "_" + originalFileName;

// AFTER (secure)
String fileName = UUID.randomUUID() + ".pdf";
```

### CR-B3 — Magic Bytes

`Content-Type` header is set by client — attacker can send `.exe` with `Content-Type: application/pdf`.

Magic bytes = first bytes of file identify its real type. PDF always starts with `%PDF-` (`25 50 44 46 2D`).

**Fix:** Read first 5 bytes from `file.getInputStream()` and compare with `%PDF-`. Both must match: Content-Type + magic bytes.

### CR-B1 — URL Validation (Defense in Depth)

Frontend validates URL — but API is public, someone can send request bypassing frontend.

`javascript:alert(document.cookie)` saved as `externalUrl` → frontend renders `<a href="javascript:...">` → XSS on click.

**Fix:** URL must start with `http://` or `https://`. Applies to both `createCV` and `updateCV`.

### CR-B2 — @NotNull on StageUpdateRequest

No `@NotNull` on `status` → `null` passes to service → NPE → 500 Internal Server Error.

**Fix:** `@NotNull ApplicationStatus status` in `StageUpdateRequest.java`. Bean Validation catches null before calling service method → 400 Bad Request with readable message.

Principle: validation at system boundary (DTO/API), not inside service.

### Key Files

| File | What Changed |
|------|-------------|
| `CVService.java` | CR-1 (UUID filename), CR-B3 (magic bytes), CR-B1 (URL validation) |
| `StageUpdateRequest.java` | CR-B2 (@NotNull on status) |
| `messages.properties` / `messages_pl.properties` | New message `error.cv.urlInvalid` |

---

## Phase 4 — Code Quality and Patterns

### Spring AOP and Proxy

AOP (Aspect-Oriented Programming) = add behavior to many methods without modifying each.

Spring at startup creates **proxy** — dynamic subclass of your bean (CGLIB). When you inject `@Autowired ApplicationService`, you get proxy, not original.

```
Controller → applicationService (PROXY) → opens transaction → super.addStage() (your code) → commit/rollback
```

Proxy overrides methods (`@Override`) to add logic before/after. Therefore:
- **Private method** — Java doesn't allow overriding in subclass → proxy doesn't see it → `@Transactional` ignored
- **`this.method()`** — direct call on object, bypasses proxy → `@Transactional` ignored

### `@Transactional(readOnly = true)`

Tells Hibernate: "this transaction only reads". Hibernate disables **dirty checking** (checking if entities changed before commit). Lighter and faster for `findAll...` methods.

### CR-10 — Fixed

Removed `@Transactional` from private method `markCurrentStageCompleted()` in `ApplicationService.java:148`.
Annotation was ignored (private method) and misleading — method always works within `addStage()` transaction.

### CR-B7 — user_id NOT NULL

Migration V4 added `user_id` as nullable ("for now, existing rows have null") and never enforced NOT NULL. Result: database didn't prevent inserting record without owner.

**Fix:** Migration V11 — removes orphaned rows (without `user_id`), then `ALTER TABLE ... SET NOT NULL` on `applications` and `cvs`.

Principle: **Don't edit historical Flyway migrations** — Flyway verifies checksum of each applied file. Changing comments in V2/V4 would trigger `checksum mismatch` on production.

### GlobalExceptionHandler — How It Works

`@RestControllerAdvice` = Spring knows this class handles exceptions from all controllers.
`extends ResponseEntityExceptionHandler` = you inherit from Spring MVC base class that already handles internal exceptions (e.g., `MethodArgumentNotValidException`). You can override its methods via `@Override`.
`@Order(HIGHEST_PRECEDENCE)` = if there were multiple handlers — this one has priority.

**ProblemDetail** = Spring class (RFC 9457). Instead of custom JSON you use ready structure.
`problem.setProperty("errors", map)` — adds custom field to response.

**MessageSource** = translation mechanism. Keys in `messages.properties` / `messages_pl.properties`.

### CR-B9 — Validation Errors as Field Map

Before: all errors in one string in `detail` → frontend didn't know which field to highlight.

After: map `field → message` in `errors`, `detail` = fixed string.

### CR-B4 — Object[] → Projection

JPQL constructor expression: `SELECT new com.applikon.dto.ApplicationStats(SUM(...), ...)` returns typed record instead of `Object[]`.

### CR-B5 — Parallel Arrays → BadgeDefinition Record

Before: 4 arrays per badge type — synchronized by index.
After: `record BadgeDefinition(String name, String icon, String description, int threshold)`.

### CR-B10 — Comments on Business Rules

Comments explain **why** rule exists, not **what** code does.
Code comments always in **English**.

### Key Files

| File | What Changed |
|------|-------------|
| `ApplicationService.java` | CR-10: removed `@Transactional` from `markCurrentStageCompleted()`; CR-B10: comments |
| `V11__user_id_not_null.sql` | CR-B7: NOT NULL on `user_id` |
| `GlobalExceptionHandler.java` | CR-B9: validation errors as field map |
| `ApplicationStats.java` (new) | CR-B4: projection for statistics query |
| `StatisticsService.java` | CR-B4: Object[] → ApplicationStats; CR-B5: arrays → BadgeDefinition[] |
| `ApplicationRepository.java` | CR-B4: constructor expression in JPQL |

---

## Phase 5 — Testing: Overview, Completion, Coverage

### Two Test Levels

**Service Tests** (`@ExtendWith(MockitoExtension.class)`):
- Spring doesn't start — only JUnit + Mockito
- Repositories mocked — database doesn't exist
- Test pure logic in isolation, fast

**Controller Tests** (`@SpringBootTest + @AutoConfigureMockMvc`):
- Full Spring context starts with H2 in memory
- Go through entire stack: controller → service → repository → H2

### TestSecurityConfig — Why No JWT

Main config blocks every request without JWT (401). In tests we use `TestSecurityConfig` active only `@Profile("test")`.

### Added Tests (6 New, Total 90)

| Test | Class | What It Checks |
|------|-------|-------------|
| `uploadCV_fakePdfContentType_throws` | `CVServiceTest` | CR-B3: EXE with PDF Content-Type rejected by magic bytes |
| `uploadCV_pathTraversalFilename_doesNotEscape` | `CVServiceTest` | CR-1: file with `../` in name lands in uploadDir |
| `createCV_javascriptUrl_throws` | `CVServiceTest` | CR-B1: `javascript:` URL rejected |
| `createCV_dataUrl_throws` | `CVServiceTest` | CR-B1: `data:` URL rejected |
| `updateStage_NullStatus_ReturnsBadRequest` | `ApplicationControllerTest` | CR-B2: missing status → 400 with `errors.status` |
| `addStage_savesStageHistoryEntry` | `ApplicationServiceTest` | `addStage()` saves entry to `stage_history` |

---

*Last updated: 2026-03-28*
