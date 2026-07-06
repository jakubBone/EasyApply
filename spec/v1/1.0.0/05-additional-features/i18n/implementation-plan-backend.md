# i18n Implementation Plan — Applikon Backend

## Work Process (applicable to each phase)

1. **Implementation** — Claude makes code changes
2. **Automatic verification** — `mvn test` must be green
3. **Manual verification** — user tests endpoint manually (optional)
4. **Update plans** — Claude updates checkboxes in this file
5. **Commit suggestion** — Claude proposes commit message (format: `type(backend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue question** — Claude asks if we proceed to the next phase

---

## Implementation Status

### Phase 0 — Setup
- [x] Create `src/main/resources/i18n/` directory
- [x] `i18n/messages.properties` (English — fallback)
- [x] `i18n/messages_pl.properties` (Polish)
- [x] `MessageSource` bean in `I18nConfig.java`
- [x] `LocaleResolver` bean (`AcceptHeaderLocaleResolver`, default `en`)
- [x] `mvn test` passing

### Phase 1 — Validation Messages
- [x] `dto/ApplicationRequest.java` → keys `{validation.*}`
- [x] `dto/NoteRequest.java` → keys `{validation.*}`
- [x] `dto/StatusUpdateRequest.java` → keys `{validation.*}`
- [x] `controller/ApplicationController.java` (inline record) → keys
- [x] `controller/CVController.java` (inline params) → keys
- [x] `entity/Application.java` → keys
- [x] `entity/Note.java` → keys
- [x] `mvn test` passing

### Phase 2 — Service Exceptions
- [x] `service/ApplicationService.java` — `EntityNotFoundException`
- [x] `service/CVService.java` — `EntityNotFoundException`, `IllegalArgumentException`
- [x] `service/NoteService.java` — `EntityNotFoundException`
- [x] `service/NoteService.java` — auto-note salary change: `"Salary changed: X PLN -> Y PLN"` → i18n
- [x] `service/UserService.java` — `EntityNotFoundException`, `IllegalStateException`
- [x] `mvn test` passing

### Phase 3 — HTTP Responses
- [x] `exception/GlobalExceptionHandler.java` — `setTitle(...)`, error messages
- [x] `controller/AuthController.java` — `Map.of("error", "...")`
- [x] `mvn test` passing

### Phase 4 — Demo Data & Enum Labels
- [x] `service/UserService.java` — demo application: translate job description to English (plain string, not runtime i18n)
- [x] `entity/RejectionReason.java` — enum labels removed, frontend translates based on enum code (see decision below)
- [x] `mvn test` passing

### Phase 5 — Comments & Tests
- [x] Translate Polish comments and Javadoc in all `.java` files to English
- [x] Translate `@DisplayName` (44 methods) and test comments to English
- [x] `mvn test` passing

### Phase 6 — Rename Enum Values to English

> **This phase is summary only.** Detailed step-by-step instructions, complete mappings
> of old→new enum values, SQL contents, and execution history (with test results after each step)
> are in: `spec/i18n/enum-rename-plan.md`

#### Flyway Migrations

- [x] `V5__rename_rejection_reasons.sql` — DROP CONSTRAINT IF EXISTS + UPDATE rejection_reason
- [x] `V6__rename_note_categories.sql` — DROP CONSTRAINT IF EXISTS + UPDATE category (including legacy PYTANIE, KONTAKT)
- [x] `V7__rename_salary_types.sql` — DROP CONSTRAINT IF EXISTS + UPDATE salary_type
- [x] `V8__rename_contract_types.sql` — DROP CONSTRAINT IF EXISTS + UPDATE contract_type
- [x] `V9__rename_application_statuses.sql` — DROP CONSTRAINT IF EXISTS + UPDATE status (including legacy ROZMOWA, ZADANIE, ODRZUCONE)
- [x] `V10__fix_column_defaults.sql` — ALTER DEFAULT `'WYSLANE'`→`'SENT'`, `'INNE'`→`'OTHER'`

#### Entities

- [x] `entity/RejectionReason.java` — `BRAK_ODPOWIEDZI`→`NO_RESPONSE`, `ODMOWA_MAILOWA`→`EMAIL_REJECTION`, `ODRZUCENIE_PO_ROZMOWIE`→`REJECTED_AFTER_INTERVIEW`, `INNE`→`OTHER`
- [x] `entity/NoteCategory.java` — `PYTANIA`→`QUESTIONS`, `INNE`→`OTHER`, removed legacy `PYTANIE` and `KONTAKT`
- [x] `entity/SalaryType.java` — `BRUTTO`→`GROSS`, `NETTO`→`NET`
- [x] `entity/ContractType.java` — `UOP`→`EMPLOYMENT`, `UZ`→`MANDATE`, `INNA`→`OTHER`
- [x] `entity/ApplicationStatus.java` — `WYSLANE`→`SENT`, `W_PROCESIE`→`IN_PROGRESS`, `OFERTA`→`OFFER`, `ODMOWA`→`REJECTED`
- [x] `entity/Note.java` — default `NoteCategory.INNE` → `NoteCategory.OTHER` (3 places)
- [x] `entity/Application.java` — default `ApplicationStatus.WYSLANE` → `ApplicationStatus.SENT`

#### Services

- [x] `service/ApplicationService.java` — all references to `ApplicationStatus`
- [x] `service/StatisticsService.java` — `ODMOWA`→`REJECTED`, `OFERTA`→`OFFER`, `BRAK_ODPOWIEDZI`→`NO_RESPONSE`
- [x] `service/UserService.java` — `WYSLANE`→`SENT`, `NETTO`→`NET`, `UOP`→`EMPLOYMENT`

#### Tests

- [x] `ApplicationControllerTest`, `ApplicationServiceTest`, `StatisticsControllerTest`, `StatisticsServiceTest`, `NoteControllerTest`, `NoteServiceTest`, `CVServiceTest`
- [x] `mvn test` — 84/84 ✅

---

## Architectural Decisions

### RejectionReason Enum Labels
**Decision: Option A — frontend translates**

Backend returns code: `{ "rejectionReason": "NO_RESPONSE" }`
Frontend translates via `REJECTION_REASONS` in `kanban/types.ts` → `"Brak odpowiedzi"` / `"No response"`

**Why:** Backend returns data, frontend decides how to display it. Zero changes to API contract.

> Enum codes renamed to English in Phase 6 (were: `BRAK_ODPOWIEDZI`, `ODMOWA_MAILOWA` etc.)

### Default Language
`AcceptHeaderLocaleResolver` with `defaultLocale: en`.
- If frontend sends `Accept-Language: pl` → responses in Polish
- If frontend sends `Accept-Language: en` or no header → responses in English
- Frontend sends header automatically (see `frontend-plan.md` Phase 7)

---

## File Structure After Changes

```
src/main/
  java/com/applikon/
    config/
      I18nConfig.java          ← new: MessageSource + LocaleResolver beans
  resources/
    i18n/
      messages.properties      ← English (fallback)
      messages_pl.properties   ← Polish
```

---

## i18n Keys

```properties
# messages.properties (English — fallback)
validation.company.required=Company name is required
validation.position.required=Position is required
validation.salary.positive=Salary must be positive
validation.note.required=Note content is required
validation.status.required=Status is required
validation.stage.required=Stage name is required
validation.cv.name.required=CV name is required

error.user.notFound=User not found
error.application.notFound=Application {0} not found
error.cv.notFound=CV {0} not found
error.note.notFound=Note {0} not found
error.token.invalid=Invalid or expired refresh token
error.token.expired=Refresh token has expired
error.token.missing=Refresh token is missing
error.cv.empty=File cannot be empty
error.cv.pdfOnly=Only PDF files are allowed
error.cv.tooLarge=File cannot exceed 5MB
error.cv.nameRequired=CV name cannot be empty
error.cv.useUpload=Use uploadCV method for file uploads
error.salary.changed=Salary changed: {0} {1} -> {2} {3}

error.validation.title=Validation error
error.resource.title=Resource not found
error.request.title=Invalid request
error.server=Internal server error
```

```properties
# messages_pl.properties (Polish)
validation.company.required=Nazwa firmy nie może być pusta
validation.position.required=Nazwa stanowiska nie może być pusta
validation.salary.positive=Stawka musi być dodatnia
validation.note.required=Treść notatki nie może być pusta
validation.status.required=Status nie może być pusty
validation.stage.required=Nazwa etapu nie może być pusta
validation.cv.name.required=Nazwa CV nie może być pusta

error.user.notFound=Użytkownik nie znaleziony
error.application.notFound=Aplikacja o ID {0} nie została znaleziona
error.cv.notFound=CV o ID {0} nie zostało znalezione
error.note.notFound=Notatka o ID {0} nie została znaleziona
error.token.invalid=Nieprawidłowy lub wygasły refresh token
error.token.expired=Refresh token wygasł
error.token.missing=Brak refresh token
error.cv.empty=Plik nie może być pusty
error.cv.pdfOnly=Dozwolone są tylko pliki PDF
error.cv.tooLarge=Plik nie może przekraczać 5MB
error.cv.nameRequired=Nazwa CV nie może być pusta
error.cv.useUpload=Użyj metody uploadCV dla plików
error.salary.changed=Stawka zmieniona: {0} {1} -> {2} {3}

error.validation.title=Błąd walidacji
error.resource.title=Nie znaleziono zasobu
error.request.title=Nieprawidłowe dane
error.server=Wystąpił błąd serwera
```

---

## Usage Pattern

```java
// I18nConfig.java
@Configuration
public class I18nConfig {

    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource ms = new ResourceBundleMessageSource();
        ms.setBasename("i18n/messages");
        ms.setDefaultEncoding("UTF-8");
        ms.setFallbackToSystemLocale(false);
        return ms;
    }

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(Locale.ENGLISH);
        return resolver;
    }
}
```

```java
// Validation (automatic via Spring)
@NotBlank(message = "{validation.company.required}")

// In services (MessageSource via constructor)
throw new EntityNotFoundException(
    messageSource.getMessage("error.application.notFound",
        new Object[]{id}, LocaleContextHolder.getLocale())
);

// In GlobalExceptionHandler
problem.setTitle(messageSource.getMessage(
    "error.validation.title", null, LocaleContextHolder.getLocale()));

// NoteService — auto-note salary change
String content = messageSource.getMessage(
    "error.salary.changed",
    new Object[]{oldSalary, oldCurrency, newSalary, newCurrency},
    LocaleContextHolder.getLocale());
```

---

## Out of Scope

- Badge names (`"Rękawica"`, `"Widmo"` etc.) — returned by API as keys, translated by frontend via `badges.json`
- Domain values in DB (`"Wysłane"` as `StageHistory.stageName`) — data migration, separate task
- `RejectionReason` enum labels — translated by frontend (see decision above)

---

*Last update: 2026-03-29*
