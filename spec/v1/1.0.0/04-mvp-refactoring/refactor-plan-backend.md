# 1.0.0 04-mvp-refactoring — Refactor Plan (backend)

Remediation of the backend findings from
[`03-mvp-review`](../03-mvp-review/mvp-code-review.md). The review produced 13
backend items, from a path traversal in CV upload down to code-quality cleanups.
This plan groups them into five passes and tracks each one to green.

For the package layout and endpoints as they exist now, read
[`architecture.md`](../../../architecture.md).

## Findings and status

Source: `03-mvp-review/mvp-code-review.md`.

### Critical (security / correctness)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-1 | Path traversal in CV upload | `CVService.java` | 3 | ✅ | ✅ |
| CR-5 | Missing SameSite on refresh_token cookie | `OAuth2AuthenticationSuccessHandler.java` | 2 | ✅ | ✅ |
| CR-3 | Refresh token contract — backend returns `"token"` instead of `"accessToken"` | `AuthController.java` | 2 | ✅ | ✅ |
| CR-B1 | No URL validation in backend (externalUrl in CV) | `CVService.java` | 3 | ✅ | ✅ |
| CR-B3 | File validation only Content-Type, missing magic bytes | `CVService.java` | 3 | ✅ | ✅ |

### Important (correctness / quality)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-B2 | No @NotNull on status in StageUpdateRequest | `StageUpdateRequest.java` | 3 | ✅ | ✅ |
| CR-10 | @Transactional on private method (AOP ignores) | `ApplicationService.java` | 4 | ✅ | ✅ |
| CR-B7 | user_id nullable — no NOT NULL constraint | new Flyway migration | 4 | ✅ | ✅ |
| CR-B9 | Validation errors as string instead of field map | `GlobalExceptionHandler.java` | 4 | ✅ | ✅ |

### Nice to Have (code quality)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-B4 | Object[] in statistics query → projection/DTO | `ApplicationRepository.java`, `StatisticsService.java` | 4 | ✅ | ✅ |
| CR-B5 | 5 parallel arrays in StatisticsService → record Badge | `StatisticsService.java` | 4 | ✅ | ✅ |
| CR-B8 | Deprecated enums in NoteCategory (PYTANIE, KONTAKT) | `NoteCategory.java` + migration | 4 | ✅ | ✅ |
| CR-B10 | Comments on business rules in updateStage() | `ApplicationService.java` | 4 | ✅ | ✅ |

**Legend:**
- **Status** ⬜/✅ — code change done
- **Tested** ⬜/✅ — tests passed and the change was verified by hand

## Step 1 — Architecture pass

No code change. A walk over the request path — Spring Security filter chain,
`MdcUserFilter`, controller, service, repository — to establish where each of the
findings actually lives before touching anything.

**Checklist**
- [x] Request path and layer responsibilities mapped against the findings list

## Step 2 — Security: OAuth2, JWT, cookies

**Build**
- CR-5: add `SameSite` to the refresh-token cookie in
  `OAuth2AuthenticationSuccessHandler`, alongside `HttpOnly` and `Secure`.
  Without it the browser sends the cookie on requests originating from other
  sites, which is what a CSRF attack needs. Planned as `Lax`; `Strict` shipped.
- CR-3: the backend returns `"token"` while the frontend reads `"accessToken"`.
  The refresh call therefore never found a token, so instead of a silent renewal
  the user was logged out. Rename the field in `AuthController`.

**Checklist**
- [x] CR-5 — SameSite on the refresh-token cookie
- [x] CR-3 — token field renamed to `accessToken` on both sides

## Step 3 — Security: data and file validation

**Build**
- CR-1 — path traversal. A filename like `../../etc/cron.d/malicious` writes
  outside the upload directory. Defence: `resolve()` + `normalize()`, then check
  the result still `startsWith(uploadDir)`. Better still, a UUID as the name on
  disk and the original name only in the database.
- CR-B1 — URL validation on the backend. The frontend validates, but the API is
  public and can be called directly, so `externalUrl` could arrive as
  `javascript:alert(1)`. Accept only the `http://` and `https://` schemes.
- CR-B3 — magic bytes. Content-Type is set by the client and trivially forged.
  Check the leading bytes instead: a PDF starts with `%PDF-` (`25 50 44 46 2D`).
- CR-B2 — `@NotNull` on `StageUpdateRequest.status`. Without it a null passes
  validation and becomes an NPE and a 500; with it the caller gets a readable
  400. The rule: validate at the system boundary, not inside the service.

**Checklist**
- [x] CR-1 — path traversal blocked
- [x] CR-B3 — magic-byte check
- [x] CR-B1 — server-side URL validation
- [x] CR-B2 — `@NotNull` on status

## Step 4 — Code quality, patterns, data integrity

**Build**
- CR-10 — `@Transactional` on a private method. Spring AOP wraps the bean in a
  proxy, and the proxy only intercepts public methods called from outside. On a
  private method the annotation is silently ignored. Remove it.
- CR-B7 — `user_id` nullable. Migration `V4` added the column as nullable ("the
  existing rows have none for now") and never followed up, so the database still
  allows orphaned records. A migration adds `NOT NULL`.
- CR-B9 — validation errors returned as one concatenated string, so the frontend
  cannot tell which field failed. Return a `{field: message}` map through
  `ProblemDetail.setProperty()`, per RFC 9457.
- CR-B4 — the statistics query returns `Object[]`, which loses types and breaks
  on any column reorder. Use a JPQL constructor expression
  (`SELECT new StatsDto(...)`) or an interface projection.
- CR-B5 — five parallel arrays in `StatisticsService` (names, icons,
  descriptions, thresholds, colours) kept in sync by index. One element out of
  place breaks every badge. Replace with a `Badge` record.
- CR-B8 — `NoteCategory` carries deprecated `PYTANIE` and `KONTAKT` next to
  `PYTANIA`, `FEEDBACK` and `INNE`. A migration maps old to new, then the values
  come out of the enum.
- CR-B10 — `updateStage()` holds conditional business logic with no comments.
  Document why each rule exists, not what the code does.

**Checklist**
- [x] CR-10, CR-B7, CR-B9 — correctness and data integrity
- [x] CR-B4, CR-B5, CR-B8, CR-B10 — code quality

## Step 5 — Tests for everything fixed

**Build**
- Six new tests covering the fixes: magic bytes, path traversal, URL validation,
  null status, stage history. Suite goes to 90 tests.
- Service tests run on Mockito with no Spring context; controller tests run on
  `@SpringBootTest` with `TestSecurityConfig`, which is `@Profile("test")` and
  `@Order(1)` so the chain that requires a JWT never applies.

**Checklist**
- [x] Six tests added for the fixes from Steps 2 to 4
- [x] `./mvnw test` green, 90 tests
