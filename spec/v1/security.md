# Applikon v1 — Security Reference

> Source of truth: the code. This document reflects the actual implemented state.

---

## 1. Initial login flow — Google OAuth2

```
+-------------------------------------------------------------+
| [1]  User clicks "Sign in with Google" in the browser       |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| [2]  Browser  ---->  Google                                 |
|      Google shows its login form                            |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| [3]  User enters email + password on Google                 |
|      Google verifies credentials                            |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| [4]  Google  ---->  Backend                                 |
|      Redirect with authorization code:                      |
|      /login/oauth2/code/google?code=ABC123                  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| [5]  Backend: CustomOAuth2UserService                       |
|      - exchanges the code with Google for user info         |
|        (sub / email / name)                                 |
|      - upserts user in DB via UserService.findOrCreateUser  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| [6]  Backend: OAuth2AuthenticationSuccessHandler            |
|      - JwtService -> access token (RS256, 15 min)           |
|      - JwtService -> refresh token (opaque UUID, 7 days)    |
|      - TokenHasher.hash(refresh, secret) -> store        |
|        HMAC-SHA256 hash in DB                               |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| [7]  Backend  ---->  Browser                                |
|      302 redirect: /auth/callback#token=<JWT>               |
|      Set-Cookie: refresh_token=<UUID>; HttpOnly             |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| [8]  Frontend extracts JWT from URL fragment (#token=...)   |
|      Keeps JWT in memory. User is authenticated.            |
+-------------------------------------------------------------+
```

---

## 2. Per-request flow — every authenticated `/api/**` call

```
Request: GET /api/applications
Headers: Authorization: Bearer <JWT>
         Cookie: refresh_token=<UUID>          (only sent to /api/auth/refresh)

                          |
                          v
+---------------------------------------------------------+
| Spring Security filter chain                            |
|                                                         |
|  [CORS]                                                 |
|     -> checks Origin against app.cors.allowed-origins   |
|                                                         |
|  [AdminKeyFilter]                                       |
|     -> if URI starts with /api/admin: validate          |
|        X-Admin-Key header (constant-time compare)       |
|     -> on mismatch: 403 + WARN log (URI + remote IP)    |
|                                                         |
|  [BearerTokenAuthenticationFilter]   (Spring built-in)  |
|     -> reads Authorization: Bearer <JWT>                |
|     -> JwtDecoder verifies signature with RSA public    |
|        key; rejects expired or tampered tokens          |
|     -> on failure: 401, request stops here              |
|                                                         |
|  [JwtAuthenticationConverter]                           |
|     -> JWT.sub -> AuthenticatedUser(id: UUID)           |
|     -> sets it in the SecurityContext                   |
|                                                         |
|  [ConsentRequiredFilter]   (@Component)                 |
|     -> if path is whitelisted: pass through             |
|     -> else load user; if privacyPolicyAcceptedAt is    |
|        null -> 403 {"error":"CONSENT_REQUIRED"}         |
+---------------------------------------------------------+
                          |
                          v
+---------------------------------------------------------+
| Servlet filter (auto-registered after Security chain)   |
|                                                         |
|  [MdcUserFilter]   (observability/, @Component)         |
|     -> reads AuthenticatedUser from SecurityContext     |
|     -> MDC.put("userId", user.id().toString())          |
|     -> finally: MDC.remove("userId")                    |
+---------------------------------------------------------+
                          |
                          v
@RestController
public ResponseEntity<...> getApplications(
    @AuthenticationPrincipal AuthenticatedUser user) {
    // user.id() is the UUID, ready to use
}
```

---

## 3. File inventory

| File | Package | Responsibility |
|------|---------|----------------|
| `SecurityConfig` | `config/` | Filter chain wiring, RSA keys, `JwtEncoder` / `JwtDecoder` beans, CORS, HTTP security headers, endpoint access rules |
| `AdminKeyFilter` | `security/` | Validates `X-Admin-Key` header on `/api/admin/**`; constant-time compare via `MessageDigest.isEqual`; logs WARN with URI + remote IP on every denial |
| `AuthenticatedUser` | `security/` | Record `(id: UUID)` — principal injected into controllers via `@AuthenticationPrincipal` |
| `ConsentRequiredFilter` | `security/` | `@Component`; blocks any non-whitelisted request when `user.privacyPolicyAcceptedAt` is null (returns `403 CONSENT_REQUIRED`) |
| `CustomOAuth2UserService` | `security/` | After Google login: reads `sub` / `email` / `name`, upserts the user in DB |
| `JwtAuthenticationConverter` | `security/` | Converts a validated JWT into `AuthenticatedUser` (extracts UUID from `sub` claim) |
| `JwtService` | `security/` | Generates access tokens (RS256, 15 min) and opaque refresh tokens (UUID, 7 days) |
| `OAuth2AuthenticationSuccessHandler` | `security/` | After successful Google login: issues JWT, stores hashed refresh token in DB, sets `HttpOnly` cookie, redirects to frontend |
| `TokenHasher` | `security/` | `HmacSHA256(token, secret)` helper used to hash refresh tokens before persistence; secret comes from `app.token.hmac-secret` (env `APP_TOKEN_HMAC_SECRET`), injected into `UserService` |
| `MdcUserFilter` | `observability/` | `OncePerRequestFilter`; puts `userId` (UUID) into SLF4J MDC for log correlation; auto-registered as a plain servlet filter — runs after the Spring Security chain |

---

## 4. Endpoint access rules (`SecurityConfig.authorizeHttpRequests`)

| Path | Rule | Notes |
|------|------|-------|
| `/api/auth/refresh` | `permitAll` | refresh-token cookie is the proof of identity |
| `/oauth2/**`, `/login/**` | `permitAll` | Google OAuth2 redirect endpoints |
| `/actuator/health` | `permitAll` | Health probe |
| `/api/admin/**` | `permitAll` at security-config level | Real check is `AdminKeyFilter` (`X-Admin-Key`), not JWT |
| `/swagger-ui/**`, `/swagger-ui.html`, `/v3/api-docs/**` | `permitAll` | Swagger UI + OpenAPI spec |
| `anyRequest()` | `authenticated()` | Everything else requires a valid JWT |

---

## 5. Consent whitelist (`ConsentRequiredFilter.isWhitelisted`)

Independent of the access rules above. Even when JWT auth has succeeded, this filter blocks the request unless the user has accepted the privacy policy — except for these paths:

| Path | Reason for whitelist |
|------|----------------------|
| `/api/auth/me` (any method, incl. `DELETE`) | User must be able to read their profile and delete their account before consent |
| `/api/auth/consent` | The endpoint that *grants* consent must obviously be reachable without consent |
| `/api/auth/logout` | User must be able to log out at any time |
| `/api/auth/refresh` | Token refresh runs before consent is checked at the API layer |
| `/oauth2/**`, `/login/**` | OAuth2 callback flow, not user-driven |
| `/actuator/**` | Operational probes |

> Public-path knowledge is duplicated in both `SecurityConfig.permitAll()` and `ConsentRequiredFilter.isWhitelisted()`. This is intentional — locality of the rule next to the filter that uses it was preferred over a shared constant. See `spec/post/security-review.md` §1.

---

## 6. Tokens & cryptography

| Item | Detail |
|------|--------|
| Access token | JWT, RS256, 15 min lifetime, `sub` = user UUID |
| Refresh token | Opaque UUID, 7-day lifetime, delivered as `HttpOnly` cookie. Stored in DB as **HMAC-SHA256** hash (with a server-side secret) via `TokenHasher`. A DB dump alone is useless — the attacker would also need the secret to compute lookup hashes (09-security-review hardening, replacing plain SHA-256 originally planned in 07-privacy-rodo) |
| RSA key pair | 2048-bit, generated in-memory at application startup. After a restart all access tokens become invalid — acceptable because their lifetime is 15 min anyway. Production deployments may load a PEM from env instead |
| Admin key compare | `MessageDigest.isEqual` — constant-time, defends against timing attacks |

---

## 7. HTTP security headers (set by `SecurityConfig`)

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:` | XSS defence (`unsafe-inline` retained because Swagger UI ships inline scripts/styles) |
| `X-Frame-Options` | `DENY` | Clickjacking defence |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS for one year |

---

## 8. CORS

| Setting | Value |
|---------|-------|
| Allowed origins | from `app.cors.allowed-origins` (default `http://localhost:5173`) |
| Allowed methods | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| Allowed headers | `Content-Type, Authorization, X-Admin-Key` |
| Credentials | allowed (required because the refresh-token cookie crosses origins in dev) |
| Preflight cache | 1 hour |

---

## 9. Sessions

Stateless — `SessionCreationPolicy.STATELESS`. No `HttpSession`. CSRF protection is disabled because the only cookie is the `HttpOnly` refresh token, which is consumed solely at `/api/auth/refresh`; all state-changing endpoints authenticate via the `Authorization: Bearer` header, which a malicious site cannot set cross-origin.

---

## 10. Where things were intentionally not added

These were considered during `spec/post/security-review.md` and deliberately left out of v1:

| Item | Reason |
|------|--------|
| Shared `SecurityWhitelist` constant | Two short whitelists; locality was judged more useful than DRY |
| Correlation ID filter | Overengineering for current scope; MDC already carries `userId` |
| External RSA key (PEM from env) | In-memory key is acceptable for v1; access-token TTL is 15 min |
| Structured JSON logs | Logback pattern is sufficient for v1 |
