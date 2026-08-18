# 1.0.0 07-privacy-rodo / retention-hygiene — Implementation Plan (backend)

> **Planned as deferred, built anyway.** The RODO minimum was already met by
> `cv-link-only` and `rodo-minimum`, so this was meant to wait until after
> publication — but it landed before the 1.0.0 tag and is in production. The
> checklist below was ticked retroactively against the code; two items deviate
> from the plan and are noted inline. See [`as-built.md`](../../as-built.md) §2.

## Goal

Close 07-privacy-rodo in three data hygiene areas:

1. **Auto-retention** — cron removes inactive accounts > 12 months
2. **Log audit** — verify logs don't contain emails, names, tokens
3. **Refresh token hashing** — store token in DB as hash, not plaintext

Finally: update documentation (`README.md`, `spec/README.md`, `as-built.md`)
closing 07-privacy-rodo.

---

## Current State

- `User.refreshToken` stored in DB as **plaintext UUID** (see `entity/User.java:29`)
- `MdcUserFilter` logs only user UUID (`security/MdcUserFilter.java:39`) — already OK
- `CVService` logs `fileName` (UUID.pdf) and `userId` — no PII
- No "last activity" tracking field — only signals: `createdAt` and `refreshTokenExpiry`
- No `@EnableScheduling` / crons

---

## Implementation Status

### Step 1 — Add `last_login_at` Field to User

**File:** `entity/User.java`

- [x] Add field `LocalDateTime lastLoginAt` with `@Column(name = "last_login_at")`
- [x] Method `recordLogin()` setting field to `LocalDateTime.now()`
- [x] Getter `getLastLoginAt()`

**Where to call `recordLogin()`?**

- `UserService.findOrCreateUser(...)` — for existing user update, for new set with `createdAt`
- `UserService.findByValidRefreshToken(...)` — bump on token refresh (user actively using)

**Definition of "inactive":** user who hasn't logged in or refreshed session for > 12 months.
Sufficient for portfolio project — alternative (update on every request) adds write on every API call,
which is significant overhead.

---

### Step 2 — Scheduled Job to Delete Inactive Accounts

**New file:** `service/AccountRetentionService.java`

- [x] Class `@Service` with method `@Scheduled(cron = "0 0 3 * * *")` (daily at 3:00)
- [x] Method finds users with `lastLoginAt < now() - 12 months` (or `createdAt < now() - 12 months AND lastLoginAt IS NULL` for users who registered but never accepted policy)
- [x] For each such user calls `userService.deleteAccount(userId)` (same method as `DELETE /me` — guarantees identical deletion flow)
- [ ] Logging: only count of deleted accounts (`log.info("Retention job removed {} inactive accounts", count)`) — **no** emails/IDs of deleted users
  - **Deviation:** the count line exists, but the job also logs `userId={}` per deleted account. A UUID, consistent with `MdcUserFilter`, so no PII — but not what this line asks for. Left open.

**File:** `ApplikonApplication.java`

- [x] Add `@EnableScheduling` annotation to main class (if not already there)

**Repository:**

**File:** `repository/UserRepository.java`

- [x] Add method `List<User> findByLastLoginAtBefore(LocalDateTime threshold)` (or with `@Query`)
- [x] Variant: `findInactiveUsers(LocalDateTime threshold)` catching both cases (null lastLogin + old createdAt)

**Threshold Configuration:**

- [x] Extract 12-month threshold to `application.properties`: `app.retention.inactive-months=12`
- [x] Inject via `@Value` — easier to test and adjust

---

### Step 3 — Retention Tests

**New file:** `test/service/AccountRetentionServiceTest.java`

- [ ] Test: user with `lastLoginAt > threshold` is not deleted
- [x] Test: user with `lastLoginAt < threshold` is deleted (along with CVs, applications, notes, and disk files)
- [ ] Test: user with `lastLoginAt = null` and `createdAt < threshold` is deleted
- [x] Test: when no inactive users, job ends without error and logs `count=0`
- [ ] `./mvnw test` green
  - The two open tests are the two that exercise the **query**, and `UserRepository`
    is mocked in `AccountRetentionServiceTest`, so `findInactiveUsers` itself is
    untested. The cascade in the deleted case is not asserted either — `UserService`
    is a mock, so the test proves `deleteAccount` is called, not what it removes.
    A third test, `multipleInactiveUsers_allDeleted`, exists beyond the plan.

---

### Step 4 — Refresh Token Hashing

**Current state:**

`User.refreshToken` contains plaintext UUID. `User.isRefreshTokenValid(token)`
performs `refreshToken.equals(token)`. Database leak = leak of all active sessions
of all users.

**Change:**

On save → hash (e.g., SHA-256) the token and save the hash.
On validation → hash incoming token and compare hashes.
Token itself is sent to client once (in cookie), never recovered from DB.

**File:** `security/JwtService.java` (or new `security/TokenHasher.java`)

- [x] Add util `TokenHasher.hash(String token)` — SHA-256 → hex
  - **Deviation:** built as `hash(String token, String secret)` — HMAC-SHA256 with a
    server secret, keyed, not a bare digest. Same hex output, one more argument.
- [ ] SHA-256 is sufficient (token is UUID with 122 bits of entropy — not vulnerable to rainbow tables, bcrypt/argon2 is overkill and slow)
  - Overruled by the line above. Keeping this open is the record that the decision
    changed; see also *Out of Scope*, which rejects HMAC over key rotation.

**File:** `service/UserService.java`

- [x] Refresh token generating method: save `TokenHasher.hash(token)` to DB, return plaintext to client (JwtService / Controller)
- [x] Method `findByValidRefreshToken(String token)`:
  - Hash incoming token
  - Look up in DB by hash (instead of `refreshToken.equals(...)`)
  - Check expiry

**File:** `entity/User.java`

- [x] Method `isRefreshTokenValid(String tokenHash)` accepts hash (not plaintext) and compares with `this.refreshToken`
- [x] Column name stays `refresh_token` (semantics unchanged — still "our token"), but content is now hash

**Migration of existing tokens:**

Existing refresh tokens in DB are plaintext. After deploying hashing they
won't match hashed versions — all logged-in users will be
logged out. **Acceptable** (one-time inconvenience for < 10 users at this point).

- [ ] One-time script (optional): `UPDATE users SET refresh_token = NULL WHERE refresh_token IS NOT NULL;` — to force re-login instead of leaving users with "broken session" until expiry
  - No migration does this and nothing in the repo records whether it was run by
    hand. Left open rather than guessed at; it was optional and the window has passed.

---

### Step 5 — Hashing Tests

**Files:** `test/security/JwtServiceTest.java` / `test/service/UserServiceTest.java`

- [ ] Test: after generating refresh token, DB contains hash (not plaintext)
- [ ] Test: `findByValidRefreshToken(plaintext)` finds user (hashes and matches)
- [ ] Test: `findByValidRefreshToken(wrongToken)` throws exception / returns empty
- [x] Test: `TokenHasher.hash("abc")` returns deterministic hex string
- [ ] `./mvnw test` green
  - `TokenHasherTest` covers the util (hex, deterministic, distinct inputs, distinct
    secrets). The three open tests are the ones on `UserService`, and there is no
    `UserServiceTest` — nothing in `src/test` touches `saveRefreshToken` or
    `findByValidRefreshToken`. The hashing round trip is untested.

---

### Step 6 — Log Audit

**Goal:** review code for PII logging (email, name, tokens).

**Known places — to verify:**

- [x] `MdcUserFilter` — logs only `userId` (UUID) ✅ OK (verification)
- [x] `CVService.uploadCV` — `log.info("Uploaded CV file={} for user={}", fileName, userId)` — fileName is generated UUID, not original filename; userId is UUID ✅ OK
- [x] `OAuth2AuthenticationSuccessHandler` — check if it logs email or name after Google login
- [x] `CustomOAuth2UserService` — check if it logs `oAuth2User.getAttribute("email")` or `name`
- [x] `AuthController.refresh` and `logout` — whether they log token from cookie
- [x] `GlobalExceptionHandler` — whether it logs full request body or stacktrace with PII
- [x] `JwtService` — whether it logs token in DEBUG logs
- [x] `application.properties` — `spring.jpa.show-sql=true` (SQL in logs reveals queries, including email in `WHERE email = ?`)

**Tasks:**

- [x] Review all `log.info/warn/error/debug` in `main/java/com/applikon/**`
- [x] Each user logging should identify only by `userId` (UUID)
- [x] No logging contains raw token (neither access nor refresh)
- [x] Consider `spring.jpa.show-sql=false` for `prod` profile (or filter SQL via Logback pattern) — off in `prod`, and `${JPA_SHOW_SQL:false}` by default; on only in `dev` and `local`
- [x] Error logs (`log.error(..., e)`) — verify exception message doesn't contain PII from request body — `AuthController.refresh` logs `e.getMessage()`, which is a `MessageSource` key, not a token

**Manual test:**

- [ ] Generate several requests (login, logout, consent, delete account, upload attempt) and review logs — no emails, names, tokens

---

### Step 7 — Rate Limiting on Sensitive Endpoints (optional)

**Goal:** minimize abuse risk for `DELETE /me` (so logged-in attacker can't spam requests).

**Decision:** for portfolio project with ~10-50 users this is **excessive**. Spring
Security + restriction to logged-in users is sufficient. Deferring.

- [x] This step marked as "not implemented in 07-privacy-rodo"

---

### Step 8 — Close 07-privacy-rodo: Documentation

**File:** `README.md`

- [x] Add **"Privacy & Data"** section:
  - What data we collect (minimum)
  - Decision: CV only via link (variant B from 07-privacy-rodo brief)
  - Link to `/privacy` in live app
  - Link to retention policy
  - Note: "Portfolio project — see `spec/v1/1.0.0/07-privacy-rodo/` for design rationale"

**File:** `spec/README.md`

- [ ] Add row to V1 table:
  ```
  | Privacy & RODO | `v1/1.0.0/07-privacy-rodo/` | Complete |
  ```
  - Still open, and now questionable: `spec/README.md` has no V1 status table at
    all, only the folder tree. Adding a lone status row would be the only status
    claim in a file that deliberately carries none. Recorded in `as-built.md` §3.

**File:** `spec/v1/1.0.0/as-built.md`

- [x] Update sections:
  - REST endpoints: `POST /api/auth/consent`, `DELETE /api/auth/me` (new), `POST /api/cv/upload` returns 503
  - DB schema: new columns `users.privacy_policy_accepted_at`, `users.last_login_at`; `refresh_token` now hashed
  - Frontend: `/privacy`, `/settings`, `ConsentGate`, `Footer`
  - Scheduled jobs: `AccountRetentionService` (cron daily 3:00)
  - Auth flow: new "consent check" step between login and app access
  - All of it landed in `spec/architecture.md`, not `as-built.md` — the inventory
    belongs there, and as-built carries deviations only. `architecture.md:290`
    records the HMAC decision and attributes it to `09-security-review`, which is
    where the Step 4 deviation came from.

---

## Definition of Done (DoD)

- [x] Field `last_login_at` is set on login and refresh token
- [x] Cron `AccountRetentionService` runs daily, removes accounts with `lastLoginAt < now() - 12 months`
- [x] Retention is unit tested — the service is; the `findInactiveUsers` query is not
- [x] Refresh token stored in DB as SHA-256 hash (not plaintext) — HMAC-SHA256, keyed
- [x] Refresh token validation works (hashes incoming token and compares) — in production, but with no test
- [x] Logs don't contain emails, user names, tokens in plaintext (manual verification + code review)
- [ ] `./mvnw test` — 0 failed
- [x] `README.md` has "Privacy & Data" section
- [ ] `spec/README.md` marks 07-privacy-rodo as "Complete"
- [x] `spec/v1/1.0.0/as-built.md` updated

---

## Out of Scope

- **Rate limiting** — considered in Step 7, rejected for this plan
- **Audit log tables (who logged in when)** — contradicts data minimization
- **Encryption of entire `users` table at-rest in application** — infrastructure level (DB/disk), not application
- **Email notifications before deleting inactive account** — no mail system, out of scope
- **Configurable per-user retention** — one policy for all
- **User login history** — one `lastLoginAt` field, no history table
- **Hash key rotation** — SHA-256 doesn't use a key; if we used HMAC, rotation would be a problem — hence simple SHA-256
  - Overtaken by events: `09-security-review` chose HMAC-SHA256 with a server
    secret. Rotation is therefore a real, unaddressed concern — rotating the secret
    logs everyone out.

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
| `spec/README.md` | modify | 07-privacy-rodo row |
| `spec/v1/1.0.0/as-built.md` | modify | New endpoints, DB fields, frontend, scheduled jobs |

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
