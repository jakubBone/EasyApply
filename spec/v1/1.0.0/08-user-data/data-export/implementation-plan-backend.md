# Data Export Implementation Plan — Backend

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

Add endpoint `GET /api/auth/me/export` returning all logged-in user data
as JSON file for download. Fulfills RODO Art. 20 requirement (right to
data portability).

---

## Architecture

```
GET /api/auth/me/export
        ↓
AuthController.exportMyData(@AuthenticationPrincipal)
        ↓
UserExportService.buildExport(userId)
  → UserRepository.findById
  → ApplicationRepository.findByUserId
  → for each application: NoteRepository.findByApplicationId
        ↓
ResponseEntity with Content-Disposition: attachment header
filename: applikon-export.json
```

---

## Implementation Status

### Phase 1 — DTO `UserExportResponse`

**New file:** `dto/UserExportResponse.java`

- [x] Create record `UserExportResponse` with nested records:

```java
public record UserExportResponse(
    ProfileExport profile,
    List<ApplicationExport> applications
) {
    public record ProfileExport(
        String email,
        String name,
        String createdAt,
        String privacyPolicyAcceptedAt
    ) {}

    public record ApplicationExport(
        Long id,
        String company,
        String position,
        String link,
        Integer salaryMin,
        Integer salaryMax,
        String currency,
        String salaryType,
        String contractType,
        String salarySource,
        String source,
        String status,
        String jobDescription,
        String agency,
        String currentStage,
        String rejectionReason,
        String rejectionDetails,
        String appliedAt,
        CvExport cv,
        List<NoteExport> notes
    ) {}

    public record CvExport(
        String name,
        String type,
        String externalUrl
    ) {}

    public record NoteExport(
        String content,
        String category,
        String createdAt
    ) {}
}
```

Dates as `String` (ISO-8601) — consistent with rest of DTOs in project.

**What we don't export:** user `id`, `google_id`, `refresh_token`,
internal CV and note IDs, `user_id` in applications — these are system data.

- [x] `./mvnw test` — green (DTO by itself doesn't break anything)

---

### Phase 2 — `UserExportService`

**New file:** `service/UserExportService.java`

- [x] Create service with method `buildExport(UUID userId)`:

```java
@Service
public class UserExportService {

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final NoteRepository noteRepository;

    public UserExportService(UserRepository userRepository,
                             ApplicationRepository applicationRepository,
                             NoteRepository noteRepository) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.noteRepository = noteRepository;
    }

    public UserExportResponse buildExport(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(EntityNotFoundException::new);

        List<Application> applications = applicationRepository.findByUserId(userId);

        List<ApplicationExport> appExports = applications.stream()
            .map(app -> {
                List<Note> notes = noteRepository.findByApplicationId(app.getId());
                return mapApplication(app, notes);
            })
            .toList();

        return new UserExportResponse(mapProfile(user), appExports);
    }

    private ProfileExport mapProfile(User user) {
        return new ProfileExport(
            user.getEmail(),
            user.getName(),
            user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
            user.getPrivacyPolicyAcceptedAt() != null
                ? user.getPrivacyPolicyAcceptedAt().toString() : null
        );
    }

    private ApplicationExport mapApplication(Application app, List<Note> notes) {
        CvExport cvExport = null;
        if (app.getCv() != null) {
            CV cv = app.getCv();
            cvExport = new CvExport(
                cv.getOriginalFileName(),
                cv.getType() != null ? cv.getType().name() : null,
                cv.getExternalUrl()
            );
        }

        List<NoteExport> noteExports = notes.stream()
            .map(n -> new NoteExport(
                n.getContent(),
                n.getCategory() != null ? n.getCategory().name() : null,
                n.getCreatedAt() != null ? n.getCreatedAt().toString() : null
            ))
            .toList();

        return new ApplicationExport(
            app.getId(),
            app.getCompany(),
            app.getPosition(),
            app.getLink(),
            app.getSalaryMin(),
            app.getSalaryMax(),
            app.getCurrency(),
            app.getSalaryType() != null ? app.getSalaryType().name() : null,
            app.getContractType() != null ? app.getContractType().name() : null,
            app.getSalarySource() != null ? app.getSalarySource().name() : null,
            app.getSource(),
            app.getStatus() != null ? app.getStatus().name() : null,
            app.getJobDescription(),
            app.getAgency(),
            app.getCurrentStage(),
            app.getRejectionReason() != null ? app.getRejectionReason().name() : null,
            app.getRejectionDetails(),
            app.getAppliedAt() != null ? app.getAppliedAt().toString() : null,
            cvExport,
            noteExports
        );
    }
}
```

- [x] Check if `NoteRepository` has method `findByApplicationId(Long id)`.
  Used existing `findByApplicationIdOrderByCreatedAtDesc`.
- [x] `./mvnw test` — green

---

### Phase 3 — Endpoint w `AuthController`

**File:** `controller/AuthController.java`

- [x] Add `UserExportService` dependency to controller constructor
- [x] Add `exportMyData` method:

```java
@GetMapping("/me/export")
public ResponseEntity<UserExportResponse> exportMyData(
        @AuthenticationPrincipal AuthenticatedUser principal) {

    UserExportResponse export = userExportService.buildExport(principal.id());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"applikon-export.json\"")
        .body(export);
}
```

Header `Content-Disposition: attachment` causes browser to download
file instead of displaying it in a tab.

- [x] `./mvnw test` — green

---

### Phase 4 — Tests

**File:** `test/controller/AuthControllerTest.java`

- [x] Test `GET /api/auth/me/export` — user with 1 application and 1 note:
  - Response `200 OK`
  - Header `Content-Disposition` contains `attachment`
  - Body contains test user's `profile.email`
  - Body contains `applications` list with 1 element
  - Application has `notes` list with 1 element
- [x] Test `GET /api/auth/me/export` — user with no applications:
  - Response `200 OK`
  - `applications` is empty list `[]`
- [x] Test without JWT: TestSecurityConfig uses `permitAll()` — can't test 401
  at controller layer; enforced by production `SecurityConfig`
- [x] `./mvnw test` — all tests green

---

## Definition of Done (DoD)

- [x] `GET /api/auth/me/export` returns `200` with `Content-Disposition: attachment; filename="applikon-export.json"`
- [x] JSON contains user's profile + applications + notes + CV
- [x] JSON doesn't contain `google_id`, `refresh_token`, other users' data
- [x] Endpoint without JWT returns `401` (enforced by production `SecurityConfig`; untestable in test profile with `permitAll()`)
- [x] No DB schema changes (no new Flyway migration)
- [x] `./mvnw test` — 0 failed

---

## Edge Cases — Design Decisions

| # | Scenario | Decision |
|---|---|---|
| EC-1 | CV type `FILE` — `externalUrl` may be null (upload disabled since phase 07) | Export metadata as-is; `externalUrl: null` in JSON is correct behavior |

---

## Out of Scope

- **CSV export** — JSON only; sufficient for GDPR requirements
- **File encryption** — user downloads via HTTPS, responsible for storage
- **CV file export (FILE type)** — export metadata only (name, URL);
  PDF files out of scope (CV file upload disabled since phase 07 anyway)

---

## Files to Change

| File | Change |
|------|--------|
| `dto/UserExportResponse.java` | **New file** — record with nested records |
| `service/UserExportService.java` | **New file** — export building logic |
| `controller/AuthController.java` | New endpoint `GET /me/export` |
| `repository/NoteRepository.java` | Add `findByApplicationId` if missing |
| `test/controller/AuthControllerTest.java` | 3 new tests |
