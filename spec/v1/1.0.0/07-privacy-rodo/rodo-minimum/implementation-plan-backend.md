# RODO Minimum Implementation Plan — Applikon Backend

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

Implement RODO minimum on backend:
1. **Privacy policy consent** — recorded in database, required before
   access to app for new users
2. **Right to delete data** — endpoint `DELETE /api/auth/me` deletes
   user and all their data (CVs, applications, notes, files from disk)
3. **No bonus features** — no data export, no consent cookies
   beyond minimum

---

## Consent Flow Architecture

```
  New user logs in via Google
            ↓
  CustomOAuth2UserService.loadUser
            ↓
  UserService.findOrCreateUser
    → creates User with privacy_policy_accepted_at = NULL
            ↓
  Frontend receives JWT
            ↓
  Frontend calls GET /api/auth/me
    → Response contains privacyPolicyAcceptedAt (null for new user)
            ↓
  Frontend: if null → shows consent screen (UI blocked)
            ↓
  User accepts → POST /api/auth/consent
    → Backend: privacy_policy_accepted_at = now()
            ↓
  Normal access to app
```

**Endpoint protection:** guard (filter or HandlerInterceptor) checks
`privacyPolicyAcceptedAt` field on every call outside whitelist
(`/api/auth/me`, `/api/auth/consent`, `/api/auth/logout`, `/api/auth/refresh`,
`DELETE /api/auth/me`). If field `null` → `403 Forbidden` with
`CONSENT_REQUIRED` code in body.

**Why does user exist in database before consent acceptance?**
Technically we must save user to issue JWT (JWT contains userId).
Alternative — keeping "pending" state in session — introduces significantly
more code. Trade-off: user is in DB but cannot do anything without consent
(except accept or log out). In practice column `privacy_policy_accepted_at = NULL`
means "user mid-registration". On account deletion we remove the same way.

---

## Implementation Status

### Phase 1 — Schema Migration: `privacy_policy_accepted_at` Field

**Entity file:** `entity/User.java`

- [x] Add field `LocalDateTime privacyPolicyAcceptedAt` with `@Column(name = "privacy_policy_accepted_at")` (nullable)
- [x] Add getter `getPrivacyPolicyAcceptedAt()`
- [x] Add domain method `acceptPrivacyPolicy()` setting field to `LocalDateTime.now()` (**idempotent** — if already set, does not overwrite; enforces domain invariant)
- [x] **Flyway migration V13** `V13__user_privacy_policy_accepted_at.sql` — plan assumed `ddl-auto=update`, but project uses Flyway (migrations V1–V12 in `db/migration/`), so instead of relying on Hibernate I wrote proper migration
- [x] `./mvnw test` — 88/88 passing

**Schema:**

```java
@Column(name = "privacy_policy_accepted_at")
private LocalDateTime privacyPolicyAcceptedAt;

public LocalDateTime getPrivacyPolicyAcceptedAt() { return privacyPolicyAcceptedAt; }

public void acceptPrivacyPolicy() {
    this.privacyPolicyAcceptedAt = LocalDateTime.now();
}
```

---

### Phase 2 — `UserResponse` Exposes Consent Status

**File:** `dto/UserResponse.java`

- [x] Add `privacyPolicyAcceptedAt` field as `String` (ISO-8601 from `LocalDateTime.toString()`, null-safe) — consistent with `CVResponse.uploadedAt`
- [x] Frontend decides whether to show consent screen based on this field
- [x] `./mvnw test` — 88/88 green (no test for `/api/auth/me` in project, nothing to update)

---

### Phase 3 — Endpoint `POST /api/auth/consent`

**File:** `controller/AuthController.java`

- [x] Add new endpoint `POST /api/auth/consent`
- [x] Requires logged-in user (`@AuthenticationPrincipal`)
- [x] Idempotent: if user already accepted, doesn't overwrite date — returns 204
- [x] Calls new method `userService.acceptPrivacyPolicy(userId)`
- [x] Response: `204 No Content`

**Schema:**

```java
@PostMapping("/consent")
public ResponseEntity<Void> acceptConsent(
        @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
    userService.acceptPrivacyPolicy(authenticatedUser.id());
    return ResponseEntity.noContent().build();
}
```

**In `UserService`:**

```java
@Transactional
public void acceptPrivacyPolicy(UUID userId) {
    User user = getById(userId);
    if (user.getPrivacyPolicyAcceptedAt() == null) {
        user.acceptPrivacyPolicy();
        userRepository.save(user);
    }
}
```

---

### Phase 4 — Consent Enforcing Guard

**New file:** `security/ConsentRequiredFilter.java` (or `HandlerInterceptor`)

- [x] Filter after `JwtAuthenticationConverter` — user is already authenticated
- [x] Endpoint whitelist (absolute paths):
  - `GET /api/auth/me`
  - `POST /api/auth/consent`
  - `POST /api/auth/logout`
  - `POST /api/auth/refresh`
  - `DELETE /api/auth/me`
  - `/actuator/**` (if used)
- [x] For others: fetch user from DB, check `privacyPolicyAcceptedAt`
- [x] If `null` → return `403 Forbidden` with body `{"error": "CONSENT_REQUIRED"}`
- [x] Register in `SecurityConfig.java` — add filter to chain after JWT
- [x] `./mvnw test` — controller tests requiring consent must now create user with date set in setup

**Decision to confirm:** path `DELETE /api/auth/me` in whitelist — user without consent must still be able to delete their account (this is GDPR right, independent of service consent).

---

### Phase 5 — Endpoint `DELETE /api/auth/me`

**File:** `controller/AuthController.java`

- [x] Add endpoint `DELETE /api/auth/me`
- [x] Calls `userService.deleteAccount(userId)`
- [x] Clears `refresh_token` cookie (analogous to logout)
- [x] Response: `204 No Content`

**Schema:**

```java
@DeleteMapping("/me")
public ResponseEntity<Void> deleteAccount(
        @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
        HttpServletResponse response) {
    userService.deleteAccount(authenticatedUser.id());

    Cookie cookie = new Cookie("refresh_token", "");
    cookie.setHttpOnly(true);
    cookie.setSecure(true);
    cookie.setPath("/api/auth");
    cookie.setMaxAge(0);
    response.addCookie(cookie);

    return ResponseEntity.noContent().build();
}
```

**In `UserService`:**

```java
@Transactional
public void deleteAccount(UUID userId) {
    User user = getById(userId);

    // 1. Physical CV files from disk
    List<CV> cvs = cvRepository.findByUserId(userId);
    for (CV cv : cvs) {
        if (cv.getType() == CVType.FILE && cv.getFilePath() != null) {
            try { Files.deleteIfExists(Paths.get(cv.getFilePath())); }
            catch (IOException e) { log.warn("Could not delete CV file {}", cv.getFilePath(), e); }
        }
    }

    // 2. Delete notes (before applications, to avoid FK constraint issues)
    List<Application> applications = applicationRepository.findByUserId(userId);
    for (Application app : applications) {
        noteRepository.deleteByApplicationId(app.getId());
    }

    // 3. Delete applications
    applicationRepository.deleteAll(applications);

    // 4. Delete CVs
    cvRepository.deleteAll(cvs);

    // 5. Delete user
    userRepository.delete(user);
}
```

**Decision:** **Manual deletion** — explicit ordering (notes → applications → CVs → user),
easier to debug, guarantees disk files are cleaned up before records are removed.

---

### Phase 6 — Page `/privacy` (static content via backend?)

**Design decision:** Do we serve the policy page from frontend (React
route) or from backend (REST endpoint returning markdown/HTML)?

**Recommendation:** **Frontend**. Policy is part of UI (styling, i18n,
navigation in app). Backend doesn't need to know about its existence.

**So in this plan:** no backend tasks for `/privacy`. Page
fully handled in frontend plan.

---

### Phase 7 — Tests

**File:** `test/controller/AuthControllerTest.java` (and possibly new files)

- [x] Test `POST /api/auth/consent` for new user:
  - Response 204
  - Field `privacy_policy_accepted_at` is set in DB
- [x] Test `POST /api/auth/consent` twice:
  - Second call doesn't change date (idempotency)
- [x] Test `GET /api/auth/me` returns `privacyPolicyAcceptedAt` in response
- [x] Guard test: calling `DELETE /api/auth/me` removes user + all data
- [x] `./mvnw test` — 92 tests green (88 existing + 4 new AuthControllerTest)

**Other tests** (CVControllerTest, ApplicationControllerTest, etc.):
- [x] Setup creates user with set `privacyPolicyAcceptedAt = LocalDateTime.now()`
- [x] Change in `@BeforeEach` method across all 4 test classes

---

## Definition of Done (DoD)

- [x] New user after Google login has `privacy_policy_accepted_at = NULL` in DB
- [x] `GET /api/auth/me` returns `privacyPolicyAcceptedAt` field (null or ISO-8601)
- [x] `POST /api/auth/consent` sets field to `now()`, idempotent
- [x] Guard: all endpoints outside whitelist return 403 `CONSENT_REQUIRED` for user without consent
- [x] `DELETE /api/auth/me` removes user, their CVs (records + files), applications, notes; clears refresh_token cookie
- [x] `./mvnw test` — 92 passed, 0 failed
- [x] Manual test: full flow from new user login to app access ✅

---

## Out of Scope

- **Endpoint `GET /api/auth/me/export`** — GDPR right to data portability;
  optional, considered after phase 07
- **Privacy policy versioning** — field will only be `privacy_policy_accepted_at` (timestamp),
  not `privacy_policy_version`. If we change policy and need to enforce
  re-acceptance — we'll add versioning then
- **Soft delete** — account deleted hard (hard delete). GDPR mandates complete removal
- **Audit log of who and when deleted account** — not logged, as it would mean storing data of deleted user (contradicts goal)
- **Email confirming deletion** — no email system, out of scope
- **Rate limiting on DELETE /me** — optional, but low risk (user must be logged in); considered in `retention-hygiene`

---

## Files to Change

| File | Change |
|------|--------|
| `entity/User.java` | Field `privacyPolicyAcceptedAt` + method `acceptPrivacyPolicy()` |
| `dto/UserResponse.java` | Expose `privacyPolicyAcceptedAt` field |
| `controller/AuthController.java` | `POST /api/auth/consent`, `DELETE /api/auth/me` |
| `service/UserService.java` | `acceptPrivacyPolicy(userId)`, `deleteAccount(userId)` |
| `security/ConsentRequiredFilter.java` | **New file** — guard |
| `config/SecurityConfig.java` | Register filter in chain |
| `test/controller/AuthControllerTest.java` | New tests + setup fixes |
| `test/controller/*ControllerTest.java` (others) | Setup creates user with consent |

---

*Last updated: 2026-04-23 — COMPLETE ✅*
