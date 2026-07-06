# Retention & Hygiene Implementation Plan — Applikon Backend

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

Close phase 07 in three data hygiene areas:

1. **Auto-retention** — cron removes inactive accounts > 12 months
2. **Log audit** — verify logs don't contain emails, names, tokens
3. **Refresh token hashing** — store token in DB as hash, not plaintext

Finally: update documentation (`README.md`, `spec/README.md`, `as-built.md`)
closing phase 07.

---

## Current State

- `User.refreshToken` stored in DB as **plaintext UUID** (see `entity/User.java:29`)
- `MdcUserFilter` logs only user UUID (`security/MdcUserFilter.java:39`) — already OK
- `CVService` logs `fileName` (UUID.pdf) and `userId` — no PII
- No "last activity" tracking field — only signals: `createdAt` and `refreshTokenExpiry`
- No `@EnableScheduling` / crons

---

## Implementation Status

### Phase 1 — Add `last_login_at` Field to User

**File:** `entity/User.java`

- [ ] Add field `LocalDateTime lastLoginAt` with `@Column(name = "last_login_at")`
- [ ] Method `recordLogin()` setting field to `LocalDateTime.now()`
- [ ] Getter `getLastLoginAt()`

**Where to call `recordLogin()`?**

- `UserService.findOrCreateUser(...)` — for existing user update, for new set with `createdAt`
- `UserService.findByValidRefreshToken(...)` — bump on token refresh (user actively using)

**Definition of "inactive":** user who hasn't logged in or refreshed session for > 12 months.
Sufficient for portfolio project — alternative (update on every request) adds write on every API call,
which is significant overhead.

---

### Phase 2 — Scheduled Job to Delete Inactive Accounts

**New file:** `service/AccountRetentionService.java`

- [ ] Class `@Service` with method `@Scheduled(cron = "0 0 3 * * *")` (daily at 3:00)
- [ ] Method finds users with `lastLoginAt < now() - 12 months` (or `createdAt < now() - 12 months AND lastLoginAt IS NULL` for users who registered but never accepted policy)
- [ ] For each such user calls `userService.deleteAccount(userId)` (same method as `DELETE /me` — guarantees identical deletion flow)
- [ ] Logging: only count of deleted accounts (`log.info("Retention job removed {} inactive accounts", count)`) — **no** emails/IDs of deleted users

**File:** `ApplikonApplication.java`

- [ ] Add `@EnableScheduling` annotation to main class (if not already there)

**Repository:**

**File:** `repository/UserRepository.java`

- [ ] Add method `List<User> findByLastLoginAtBefore(LocalDateTime threshold)` (or with `@Query`)
- [ ] Variant: `findInactiveUsers(LocalDateTime threshold)` catching both cases (null lastLogin + old createdAt)

**Threshold Configuration:**

- [ ] Extract 12-month threshold to `application.properties`: `app.retention.inactive-months=12`
- [ ] Inject via `@Value` — easier to test and adjust

---

### Phase 3 — Retention Tests

**New file:** `test/service/AccountRetentionServiceTest.java`

- [ ] Test: user with `lastLoginAt > threshold` is not deleted
- [ ] Test: user with `lastLoginAt < threshold` is deleted (along with CVs, applications, notes, and disk files)
- [ ] Test: user with `lastLoginAt = null` and `createdAt < threshold` is deleted
- [ ] Test: when no inactive users, job ends without error and logs `count=0`
- [ ] `./mvnw test` green

---

### Phase 4 — Refresh Token Hashing

**Current state:**

`User.refreshToken` contains plaintext UUID. `User.isRefreshTokenValid(token)`
performs `refreshToken.equals(token)`. Database leak = leak of all active sessions
of all users.

**Change:**

On save → hash (e.g., SHA-256) the token and save the hash.
On validation → hash incoming token and compare hashes.
Token itself is sent to client once (in cookie), never recovered from DB.

**File:** `security/JwtService.java` (or new `security/TokenHasher.java`)

- [ ] Add util `TokenHasher.hash(String token)` — SHA-256 → hex
- [ ] SHA-256 is sufficient (token is UUID with 122 bits of entropy — not vulnerable to rainbow tables, bcrypt/argon2 is overkill and slow)

**File:** `service/UserService.java`

- [ ] Refresh token generating method: save `TokenHasher.hash(token)` to DB, return plaintext to client (JwtService / Controller)
- [ ] Method `findByValidRefreshToken(String token)`:
  - Hash incoming token
  - Look up in DB by hash (instead of `refreshToken.equals(...)`)
  - Check expiry

**File:** `entity/User.java`

- [ ] Method `isRefreshTokenValid(String tokenHash)` accepts hash (not plaintext) and compares with `this.refreshToken`
- [ ] Column name stays `refresh_token` (semantics unchanged — still "our token"), but content is now hash

**Migration of existing tokens:**

Existing refresh tokens in DB are plaintext. After deploying hashing they
won't match hashed versions — all logged-in users will be
logged out. **Acceptable** (one-time inconvenience for < 10 users at this point).

- [ ] One-time script (optional): `UPDATE users SET refresh_token = NULL WHERE refresh_token IS NOT NULL;` — to force re-login instead of leaving users with "broken session" until expiry

---

### Phase 5 — Hashing Tests

**Files:** `test/security/JwtServiceTest.java` / `test/service/UserServiceTest.java`

- [ ] Test: after generating refresh token, DB contains hash (not plaintext)
- [ ] Test: `findByValidRefreshToken(plaintext)` finds user (hashes and matches)
- [ ] Test: `findByValidRefreshToken(wrongToken)` throws exception / returns empty
- [ ] Test: `TokenHasher.hash("abc")` returns deterministic hex string
- [ ] `./mvnw test` green

---

### Phase 6 — Log Audit

**Goal:** review code for PII logging (email, name, tokens).

**Known places — to verify:**

- [ ] `MdcUserFilter` — logs only `userId` (UUID) ✅ OK (verification)
- [ ] `CVService.uploadCV` — `log.info("Uploaded CV file={} for user={}", fileName, userId)` — fileName is generated UUID, not original filename; userId is UUID ✅ OK
- [ ] `OAuth2AuthenticationSuccessHandler` — check if it logs email or name after Google login
- [ ] `CustomOAuth2UserService` — check if it logs `oAuth2User.getAttribute("email")` or `name`
- [ ] `AuthController.refresh` and `logout` — whether they log token from cookie
- [ ] `GlobalExceptionHandler` — whether it logs full request body or stacktrace with PII
- [ ] `JwtService` — whether it logs token in DEBUG logs
- [ ] `application.properties` — `spring.jpa.show-sql=true` (SQL in logs reveals queries, including email in `WHERE email = ?`)

**Tasks:**

- [ ] Review all `log.info/warn/error/debug` in `main/java/com/applikon/**`
- [ ] Each user logging should identify only by `userId` (UUID)
- [ ] No logging contains raw token (neither access nor refresh)
- [ ] Consider `spring.jpa.show-sql=false` for `prod` profile (or filter SQL via Logback pattern)
- [ ] Error logs (`log.error(..., e)`) — verify exception message doesn't contain PII from request body

**Manual test:**

- [ ] Generate several requests (login, logout, consent, delete account, upload attempt) and review logs — no emails, names, tokens

---

### Phase 7 — Rate Limiting on Sensitive Endpoints (optional)

**Goal:** minimize abuse risk for `DELETE /me` (so logged-in attacker can't spam requests).

**Decision:** for portfolio project with ~10-50 users this is **excessive**. Spring
Security + restriction to logged-in users is sufficient. Deferring.

- [ ] This phase marked as "not implemented in phase 07"

---

### Phase 8 — Close Phase 07: Documentation

**File:** `README.md`

- [ ] Add **"Privacy & Data"** section:
  - What data we collect (minimum)
  - Decision: CV only via link (variant B from phase 07 brief)
  - Link to `/privacy` in live app
  - Link to retention policy
  - Note: "Portfolio project — see `spec/v1/1.0.0/07-privacy-rodo/` for design rationale"

**File:** `spec/README.md`

- [ ] Add row to V1 table:
  ```
  | Privacy & RODO | `v1/1.0.0/07-privacy-rodo/` | Complete |
  ```

**File:** `spec/v1/as-built.md`

- [ ] Update sections:
  - REST endpoints: `POST /api/auth/consent`, `DELETE /api/auth/me` (new), `POST /api/cv/upload` returns 503
  - DB schema: new columns `users.privacy_policy_accepted_at`, `users.last_login_at`; `refresh_token` now hashed
  - Frontend: `/privacy`, `/settings`, `ConsentGate`, `Footer`
  - Scheduled jobs: `AccountRetentionService` (cron daily 3:00)
  - Auth flow: new "consent check" step between login and app access

---

## Definition of Done (DoD)

- [ ] Field `last_login_at` is set on login and refresh token
- [ ] Cron `AccountRetentionService` runs daily, removes accounts with `lastLoginAt < now() - 12 months`
- [ ] Retention is unit tested
- [ ] Refresh token stored in DB as SHA-256 hash (not plaintext)
- [ ] Refresh token validation works (hashes incoming token and compares)
- [ ] Logs don't contain emails, user names, tokens in plaintext (manual verification + code review)
- [ ] `./mvnw test` — 0 failed
- [ ] `README.md` has "Privacy & Data" section
- [ ] `spec/README.md` marks phase 07 as "Complete"
- [ ] `spec/v1/as-built.md` updated

---

## Out of Scope

- **Rate limiting** — considered in Phase 7, rejected for this phase
- **Audit log tables (who logged in when)** — contradicts data minimization
- **Encryption of entire `users` table at-rest in application** — infrastructure level (DB/disk), not application
- **Email notifications before deleting inactive account** — no mail system, out of scope
- **Configurable per-user retention** — one policy for all
- **User login history** — one `lastLoginAt` field, no history table
- **Hash key rotation** — SHA-256 doesn't use a key; if we used HMAC, rotation would be a problem — hence simple SHA-256

---

## Files to Change / Add

| File | Status | Change |
|------|--------|--------|
| `entity/User.java` | modify | Field `lastLoginAt` + `recordLogin()`; `isRefreshTokenValid` to hash |
| `service/UserService.java` | modify | `findOrCreateUser` updates `lastLoginAt`; refresh token hashed |
| `service/AccountRetentionService.java` | **new** | `@Scheduled` cron removing inactive accounts |
| `security/TokenHasher.java` | **new** | SHA-256 util (or method in `JwtService`) |
| `repository/UserRepository.java` | modify | `findInactiveUsers(threshold)` |
| `ApplikonApplication.java` | modify | `@EnableScheduling` |
| `application.properties` | modify | `app.retention.inactive-months=12`, `spring.jpa.show-sql=false` for prod |
| `test/service/AccountRetentionServiceTest.java` | **new** | Retention tests |
| `test/service/UserServiceTest.java` | modify | Refresh token hashing tests |
| Review `log.*` in `main/java/com/applikon/**` | modify | Remove PII from logs |
| `README.md` | modify | "Privacy & Data" section |
| `spec/README.md` | modify | Phase 07 row |
| `spec/v1/as-built.md` | modify | New endpoints, DB fields, frontend, scheduled jobs |

---

## Retention Diagram

```
  Daily 3:00 (cron)
         ↓
  AccountRetentionService.cleanupInactive()
         ↓
  UserRepository.findInactiveUsers(now - 12 months)
         ↓
  For each found user:
         ↓
  UserService.deleteAccount(userId)
    ├── Files.delete(cv.filePath) for each FILE type CV
    ├── delete notes
    ├── delete applications
    ├── delete cv records
    └── delete user
         ↓
  log.info("Retention job removed {} accounts", count)
```

---

*Last updated: 2026-04-22*
