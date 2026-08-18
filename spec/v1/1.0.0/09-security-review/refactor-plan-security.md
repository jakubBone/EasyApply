# 1.0.0 09-security-review — Refactor Plan

Based on `code-review-security.md` findings.

## HIGH Priority (fix immediately)

1. **Timing Attack on Admin Key** — AdminKeyFilter.java:27
   - Replace `String.equals()` with `MessageDigest.isEqual()`
   - Estimate: 5 min
   - Files to modify: `AdminKeyFilter.java`

2. **Move Access Token from URL Query to Fragment** — OAuth2AuthenticationSuccessHandler.java:88
   - Change redirect to use `#token=` instead of `?token=`
   - Update frontend to read from fragment
   - Estimate: 15 min
   - Files to modify: `OAuth2AuthenticationSuccessHandler.java`, `authService.ts` or similar

3. **Add HTTP Security Headers** — SecurityConfig.java
   - Add CSP, X-Frame-Options, HSTS
   - Estimate: 5 min
   - Files to modify: `SecurityConfig.java`

## MEDIUM Priority (before re-enabling CV upload)

4. **Sanitize Filename in Content-Disposition** — CVController.java:70-72
   - Add filename sanitization before embedding in header
   - Estimate: 5 min
   - Files to modify: `CVController.java`

## LOW Priority (defense-in-depth)

5. **Add HMAC to TokenHasher** — TokenHasher.java:11-23
   - Implement HmacSHA256 with server-side secret
   - Update call sites to pass secret
   - Estimate: 10 min
   - Files to modify: `TokenHasher.java`, `UserService.java`, all call sites

6. **Add Audit Log for Retention Deletions** — AccountRetentionService.java:38-42
   - Log individual user IDs before deletion (not PII)
   - Estimate: 5 min
   - Files to modify: `AccountRetentionService.java`

---

## Implementation Progress

### Step 1 — Timing attack on admin key
- [x] Replace `String.equals()` with `MessageDigest.isEqual()` in `AdminKeyFilter.java`
- [x] `mvn test` green

### Step 2 — Move access token from URL query to fragment
- [x] Update redirect in `OAuth2AuthenticationSuccessHandler.java` (`?token=` → `#token=`)
- [x] Update frontend to read token from URL fragment (`AuthCallbackPage.tsx`)
- [x] `mvn test` green
- [x] `npm run build` passing
- [x] Manual: verify in browser that redirect URL uses `#token=` not `?token=`

### Step 3 — Add HTTP security headers
- [x] Add CSP, X-Frame-Options, HSTS to `SecurityConfig.java`
- [x] `mvn test` green
- [x] Manual: `curl -I http://localhost:8080/api/health` — confirm headers present in response

### Step 4 — Sanitize filename in Content-Disposition *(do before re-enabling CV upload)*
- [x] Add filename sanitization in `CVController.java`
- [x] `mvn test` green

### Step 5 — Add HMAC to TokenHasher
- [x] Implement HmacSHA256 in `TokenHasher.java`
- [x] Update all call sites (`UserService.java` and others)
- [x] Add `APP_TOKEN_HMAC_SECRET` to `.env.example` and `application.properties`
- [x] `mvn test` green

### Step 6 — Audit log for retention deletions
- [x] Log individual user UUIDs before deletion in `AccountRetentionService.java`
- [x] `mvn test` green
