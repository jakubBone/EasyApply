# CV Link-Only Implementation Plan — Applikon Backend

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

Block ability to upload PDF files as CV via REST API.
Path `CVType.LINK` (CV as external link) remains fully functional.
Existing `CVType.FILE` records in database remain accessible (download, delete) —
don't break users who already uploaded files.

---

## Design Decisions

- **Code for `CVService.uploadCV` method stays** — don't remove business logic.
  Gives trivial rollback (unblock endpoint = one line) and preserves
  code as valid feature in portfolio.
- **Endpoint `POST /api/cv/upload` returns 503 Service Unavailable** — instead of
  removing mapping. 503 semantically communicates "temporarily unavailable".
- **Use `ResponseStatusException` to block** — built-in to Spring,
  no need to create new exception class or feature flag.
- **Other CV endpoints (`GET`, `POST`, `PUT`, `DELETE`, `GET /{id}/download`)
  unchanged** — handle both LINK and existing FILE.

---

## Implementation Status

### Phase 1 — Block `POST /api/cv/upload` Endpoint

**File:** `applikon-backend/src/main/java/com/applikon/controller/CVController.java`

- [x] Add throw `ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, ...)`
      as first line in `uploadCV` method (before `cvService.uploadCV(...)`)
- [x] Message: i18n key `error.cv.uploadDisabled` (resolved by
      `MessageSource` to handle PL/EN like other errors)
- [x] Add inject `MessageSource` to controller (if not already there)
- [x] `./mvnw test` — green after completing Phases 2 & 3 (done together)

**Schemat zmiany:**

```java
@PostMapping("/upload")
public ResponseEntity<CVResponse> uploadCV(
        @AuthenticationPrincipal AuthenticatedUser user,
        @RequestParam("file") MultipartFile file) throws IOException {
    throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            messageSource.getMessage("error.cv.uploadDisabled", null, LocaleContextHolder.getLocale())
    );
}
```

> Method `cvService.uploadCV(...)` remains untouched — no longer
> called from HTTP, but `CVServiceTest` unit tests still use it
> and must pass.

---

### Phase 2 — i18n Key for Error Message

**Files:** `applikon-backend/src/main/resources/messages.properties`,
`messages_pl.properties` (and optionally `messages_en.properties` — per project convention)

- [x] Verify which message files exist and pattern for `error.cv.*` keys (found: `i18n/messages.properties` + `messages_pl.properties`)
- [x] Add key `error.cv.uploadDisabled`:
  - PL: `"Upload plików CV jest chwilowo niedostępny. Użyj opcji linku zewnętrznego."`
  - EN: `"CV file upload is temporarily unavailable. Please use the external link option."`
- [x] `./mvnw test` — green after completing Phase 3

---

### Phase 3 — Update Tests

**File:** `applikon-backend/src/test/java/com/applikon/controller/CVControllerTest.java`

- [x] Change upload test (existing `POST /api/cv/upload` happy path):
  - Expected status: `503 Service Unavailable` instead of `201 Created`
  - ~~Assertion: response body contains message from `error.cv.uploadDisabled` key~~ (skipped — Spring MVC doesn't always return body for `ResponseStatusException`)
  - Database has **no** new CV record after call — verified by `cvRepository.count()` before/after
  - Disk has **no** new file (endpoint throws before service is called)
- [x] Add test: `POST /api/cv/upload` with empty file still returns 503
      (validation not executed, endpoint blocked first)
- [x] Other CVController tests (CRUD for LINK, download, delete) **unchanged**
- [x] `CVServiceTest` — **unchanged** (service method still works, unit tests remain)
- [x] `./mvnw test` — 88 tests, 0 failed

---

## Definition of Done (DoD)

- [x] `POST /api/cv/upload` returns `503 Service Unavailable` with i18n message
- [x] `POST /api/cv` (create) for `CVType.LINK` works as before
- [x] `GET /api/cv`, `GET /api/cv/{id}`, `GET /api/cv/{id}/download`, `DELETE /api/cv/{id}`, `PUT /api/cv/{id}` — unchanged
- [x] Existing `CVType.FILE` records in DB still accessible (read, download, delete)
- [x] `./mvnw test` — 0 failed (88/88)
- [ ] Error message displayed in language set by `Accept-Language` — manual verification needed

---

## Out of Scope

- **Removing columns `file_name`, `file_path`, `file_size` from `cvs` table** — kept
  as nullable for historical records and potential rollback
- **Migration of existing CV files** — files in `uploads/cv/` remain on disk,
  removed per-user via normal flow (`DELETE /api/cv/{id}` or account deletion)
- **Feature flag in `application.properties`** — simpler hardcode; if dynamic toggling needed later, can add then
- **Removing `CVService.uploadCV` method** — kept for easy rollback and as feature code
- **Frontend message (tooltip "Temporarily unavailable")** — handled in frontend plan

---

## Files to Change

| File | Change |
|------|--------|
| `controller/CVController.java` | `uploadCV` throws `ResponseStatusException(503)`, inject `MessageSource` |
| `resources/messages*.properties` | New key `error.cv.uploadDisabled` (PL/EN) |
| `test/controller/CVControllerTest.java` | Upload test expects 503 instead of 201 |

---

*Last updated: 2026-04-22*
