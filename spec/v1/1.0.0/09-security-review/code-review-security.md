# Security Audit Report — Applikon (v09)

**Auditor:** Claude Security Auditor  
**Scope:** Last 5 commits + full security-critical surface  
**Status:** Ready for fix

---

## WARNINGS (should fix)

### 1. Timing Attack on Admin Key Comparison

- **File:** `applikon-backend/src/main/java/com/applikon/security/AdminKeyFilter.java:27`
- **Evidence:**
  ```java
  if (key == null || !key.equals(adminKey)) {
  ```
- **Risk:** `String.equals()` is not constant-time. An attacker with a high-precision clock on a local network could time responses and infer the admin key character-by-character. Low probability in practice over HTTPS, but the pattern is wrong.
- **Recommendation:** Replace with `MessageDigest.isEqual(key.getBytes(), adminKey.getBytes())` for constant-time comparison.
- **Priority:** HIGH

---

### 2. Access Token Exposed in URL Query Parameter

- **File:** `applikon-backend/src/main/java/com/applikon/security/OAuth2AuthenticationSuccessHandler.java:88`
- **Evidence:**
  ```java
  String redirectUrl = frontendUrl + "/auth/callback?token=" + accessToken;
  ```
- **Risk:** Tokens in query strings appear in:
  - Browser history
  - Server access logs (nginx/Apache)
  - Referer header to third-party scripts/analytics loaded on `/auth/callback`
  
  The token is short-lived (15 min), which limits the exposure window — but the pattern is avoidable.
  
- **Recommendation:** Use URL fragment instead (`#token=...`). Fragments are never sent to servers or logged. The frontend already reads it from the URL. Alternatively: redirect to a short-lived one-time code endpoint and let the frontend exchange it for the JWT.
- **Priority:** HIGH

---

### 3. HTTP Security Headers Not Configured

- **File:** `applikon-backend/src/main/java/com/applikon/config/SecurityConfig.java` (no `headers()` configuration present)
- **Risk:** By default Spring Security adds some headers, but the following are missing or unverified:
  - No `Content-Security-Policy` — makes stored-XSS attacks easier to exploit
  - No explicit `X-Frame-Options: DENY` — clickjacking risk (though OAuth2 flows already block framing in some browsers)
  - No `Strict-Transport-Security` (HSTS) — relevant once deployed behind HTTPS
  
- **Recommendation:** Add to `SecurityConfig.securityFilterChain()`:
  ```java
  http.headers(headers -> headers
      .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self'"))
      .frameOptions(frame -> frame.deny())
      .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
  );
  ```
- **Priority:** MEDIUM

---

### 4. Content-Disposition Header Injection (Latent)

- **File:** `applikon-backend/src/main/java/com/applikon/controller/CVController.java:70-72`
- **Evidence:**
  ```java
  .header(HttpHeaders.CONTENT_DISPOSITION,
          "attachment; filename=\"" + cv.getOriginalFileName() + "\"")
  ```
- **Risk:** A filename containing `"`, `\n`, or `\r` (stored in the DB from a prior upload) can break out of the header value and inject arbitrary HTTP response headers. 
  
  **Currently mitigated** by the upload endpoint returning 503, but the code path will be live when upload is re-enabled.
  
- **Recommendation:** Sanitize `originalFileName` before embedding it in the header. Use RFC 5987 encoding or strip unsafe characters:
  ```java
  String safeName = cv.getOriginalFileName()
      .replaceAll("[^a-zA-Z0-9._-]", "_");
  .header(HttpHeaders.CONTENT_DISPOSITION,
          "attachment; filename=\"" + safeName + "\"")
  ```
  Alternatively, use: `filename*=UTF-8''` + `URLEncoder.encode(filename)`
  
- **Priority:** MEDIUM (blocked by upload being disabled; fix before re-enabling)

---

### 5. TokenHasher Uses Plain SHA-256 Without HMAC

- **File:** `applikon-backend/src/main/java/com/applikon/security/TokenHasher.java:11-23`
- **Evidence:**
  ```java
  public static String hash(String token) {
      try {
          MessageDigest digest = MessageDigest.getInstance("SHA-256");
          byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
          // ...
      }
  }
  ```
- **Risk:** Refresh tokens are UUID v4 (128-bit random) — brute-force is not practical at current scale. However, SHA-256 without a server-side key means that if the database is compromised, an attacker with a lookup table of UUIDs (feasible to precompute) can reverse the hash. HMAC-SHA-256 with a server-side secret eliminates this entirely.
  
- **Recommendation:** Add an `app.token.hmac-secret` env variable and use HMAC:
  ```java
  @Value("${app.token.hmac-secret}")
  private String hmacSecret;
  
  public static String hash(String token, String secret) {
      try {
          Mac mac = Mac.getInstance("HmacSHA256");
          mac.init(new SecretKeySpec(secret.getBytes(UTF_8), "HmacSHA256"));
          byte[] bytes = mac.doFinal(token.getBytes(UTF_8));
          StringBuilder hex = new StringBuilder();
          for (byte b : bytes) {
              hex.append(String.format("%02x", b));
          }
          return hex.toString();
      } catch (Exception e) {
          throw new IllegalStateException("HmacSHA256 not available", e);
      }
  }
  ```
  Update all call sites: `TokenHasher.hash(token, hmacSecret)`
  
- **Priority:** LOW (UUID v4 entropy makes brute-force impractical; defense-in-depth)

---

### 6. No Audit Log for Retention Deletions

- **File:** `applikon-backend/src/main/java/com/applikon/service/AccountRetentionService.java:38-42`
- **Evidence:**
  ```java
  for (User user : inactive) {
      userService.deleteAccount(user.getId());
  }
  log.info("Retention job removed {} inactive accounts", inactive.size());
  ```
  Individual user IDs are never logged — only the count.
  
- **Risk:** GDPR Article 5(2) accountability principle requires you to be able to demonstrate compliance. If a user asks "was my data deleted?", there's no audit trail to confirm it.
  
- **Recommendation:** Log each deletion with the user UUID (not email/name, which are PII):
  ```java
  for (User user : inactive) {
      userService.deleteAccount(user.getId());
      log.info("Retention: deleted account userId={}", user.getId());
  }
  log.info("Retention job completed: {} accounts removed", inactive.size());
  ```
  
- **Priority:** LOW (compliance/audit, not an exploitable vulnerability)

---

## Good Practices Found ✓

- **No SQL injection** — Spring Data JPA with parameterized queries used throughout; no raw SQL concatenation found.
- **Consistent IDOR protection** — every service method uses `findByIdAndUserId()` or equivalent, so users cannot access each other's data. (`ApplicationService`, `CVService`, `NoteService`)
- **RS-256 JWT** — asymmetric key signing is the right choice; no shared secret that could be guessed.
- **Refresh token hashed at rest** — `TokenHasher.hash()` called in `UserService.saveRefreshToken()` before persistence.
- **HttpOnly + Secure + SameSite=Strict cookie** — refresh token cookie is well-hardened (`OAuth2AuthenticationSuccessHandler.java:77-80`).
- **CORS locked to configured origin** — no wildcard, proper `allowedOrigins` from env var.
- **Frontend URL validation** — `isSafeUrl()` uses the `URL()` constructor; properly rejects `javascript:` and `data:` schemes.
- **No hardcoded credentials** — `application.properties` uses only env var placeholders; `.env` files are gitignored and were never committed.
- **Magic-byte validation on file upload** — `CVService.uploadCV()` checks both MIME type and the `%PDF-` header bytes.
- **Actuator minimized** — only `health` and `info` exposed; `show-details=when_authorized`.
- **No dangerous HTML injection** — confirmed absent `dangerouslySetInnerHTML` across all frontend TSX files; React's default JSX escaping is in force.

---

## Summary

**Actionable fixes (before next release):**
1. Fix timing attack on admin key (5 min)
2. Move token from URL query param to fragment or use code exchange (15 min)
3. Add HTTP security headers (5 min)

**Fixes before re-enabling CV upload:**
4. Sanitize filename in Content-Disposition header (5 min)

**Nice-to-haves:**
5. Add HMAC to TokenHasher (10 min, defense-in-depth)
6. Add audit log for retention deletions (5 min, GDPR accountability)
