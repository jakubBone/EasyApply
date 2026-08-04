# 2.1.0 03-company-brief — Implementation Plan

> This is the plan as written before the build. Several parts changed while
> building — for what actually exists, read
> [`as-built.md`](../as-built.md) and the ADRs it links to.

## Design in one page

The feature is a composition of well-known patterns, and the whole plan follows
from them.

| Problem | Pattern | What it means here |
|---|---|---|
| The LLM call is slow and can fail, but the UI must show "generating…" | Asynchronous request-reply: `POST` returns 202 plus a status, `GET` polls | Three endpoints, a `status` column, and polling in the frontend |
| The AI provider must be swappable and testable offline | Ports and adapters: a `BriefChatModel` port, a real adapter, a fake adapter | The whole backend is built and tested against the fake, with no API key |
| The result is expensive and the same for every application to one company | Cache-aside, keyed by user and company | One brief per company, reused across applications, deduplicated by a unique key |
| The user can correct a field | Edit in place, with an `edited` flag on the row | The flag is what keeps the GDPR export honest |

**Language is data, not schema.** Generated text is stored one row per field per
language, never in fixed `*_pl` and `*_en` columns. Adding a locale is a new
`lang` value and a line in the prompt, never a migration. The set of languages
follows the i18n UI, today PL and EN, and is read from the locale list rather
than hard-coded.

The rest is standard hygiene. The trigger is idempotent, so a double click never
fires two AI calls. Data egress is minimised, so only the company name and the
job-ad link ever leave the system. Failure degrades gracefully: a provider error
ends as a terminal `FAILED` and the rest of the app is untouched.

## What changes

**Backend, new**
```
db/migration/V21__company_briefs.sql
entity/CompanyBrief.java              entity/BriefStatus.java
entity/CompanyBriefField.java         (one row per field and language, with an `edited` flag)
repository/CompanyBriefRepository.java
service/BriefService.java             service/BriefGenerationWorker.java
service/ai/BriefChatModel.java (port) service/ai/FakeBriefChatModel.java
service/ai/GeneratedBrief.java        (record: list of {fieldKey, lang, text}; null text = insufficient)
service/ai/BriefLocales.java          (field keys and active locales, one source of truth)
config/AsyncConfig.java
controller/BriefController.java
dto/BriefResponse.java  dto/BriefFieldDto.java  dto/BriefEditRequest.java
```

**Backend, changed:** `UserExportService.java` and `dto/UserExportResponse.java`
(edited brief fields), `messages_pl/en.properties`, `pom.xml` (Spring AI, added
in Step 2).

**Frontend, new:** `hooks/useBrief.ts`, `components/prep/BriefSection.tsx`, and
the brief fields inside the existing "About the company" edit modal.
**Frontend, changed:** `services/api.ts`, `types/domain.ts`, the "About the
company" section, `i18n/locales/{pl,en}/common.json`.

## Step 1 — Backend on the fake model, with no network and no keys

The whole resource, testable without any live AI. Generation runs through the
`BriefChatModel` port and every test runs against a fake. This is the
swappability proof ADR-v2-001 asks for.

### 1.1 Migration `V21__company_briefs.sql`

```sql
CREATE TABLE company_briefs (                       -- cache aggregate: metadata + status
    id             BIGSERIAL PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name   VARCHAR(255) NOT NULL,
    status         VARCHAR(16)  NOT NULL,          -- PENDING | READY | FAILED
    created_at     TIMESTAMP NOT NULL,
    updated_at     TIMESTAMP,
    CONSTRAINT uq_company_brief UNIQUE (user_id, company_name)
);

CREATE TABLE company_brief_fields (                 -- one row per field and language
    id         BIGSERIAL PRIMARY KEY,
    brief_id   BIGINT      NOT NULL REFERENCES company_briefs(id) ON DELETE CASCADE,
    field_key  VARCHAR(32) NOT NULL,               -- industry|product_customers|tech_stack|size_stage
    lang       VARCHAR(8)  NOT NULL,               -- 'pl' | 'en' | whatever the UI supports
    text       TEXT,                               -- NULL = "not enough public info"
    edited     BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE once the user overwrote it
    CONSTRAINT uq_brief_field UNIQUE (brief_id, field_key, lang)
);
```

`UNIQUE (user_id, company_name)` does two jobs: it is the cache key, and it is
the lock that makes the trigger idempotent.

All content, generated and edited, lives in `company_brief_fields`. The language
is a row value, so a new locale needs no schema change, and a new field is a new
`field_key` rather than a migration. The `edited` flag separates the user's own
text from derived public data, which is what §1.10 needs.

### 1.2 Entities

Following the `ScreeningAnswer` pattern: Lombok, `AuditingEntityListener`,
`@OnDelete`.

- `BriefStatus` enum: `PENDING`, `READY`, `FAILED`.
- `CompanyBrief` is the aggregate root: `@ManyToOne User user` with
  `@OnDelete CASCADE`, `String companyName`, `@Enumerated(STRING) BriefStatus status`,
  `@CreatedDate` and `@LastModifiedDate`, and
  `@OneToMany(mappedBy="brief", cascade=ALL, orphanRemoval=true) List<CompanyBriefField> fields`.
  Fields are persisted through the aggregate, so the feature needs one
  repository, not two.
- `CompanyBriefField`: `@ManyToOne CompanyBrief brief` with `@OnDelete CASCADE`,
  `String fieldKey`, `String lang`, `@Column(columnDefinition="TEXT") String text`,
  `boolean edited`. A `NULL` text with `edited=false` means "not enough public
  info": shown, never hidden, never a guess.

### 1.3 Repository

```java
interface CompanyBriefRepository extends JpaRepository<CompanyBrief, Long> {
    Optional<CompanyBrief> findByUserIdAndCompanyName(UUID userId, String companyName);
}
```

`company_brief_fields` has no repository of its own. Rows are created, replaced
and read through the `CompanyBrief` aggregate.

### 1.4 The provider port and the fake

```java
public interface BriefChatModel {                 // service/ai
    GeneratedBrief generate(String companyName, String jobAdLink);
}
// one entry per field and locale; text == null means insufficient
public record GeneratedBrief(List<Field> fields) {
    public record Field(String fieldKey, String lang, String text) {}
}
```

`BriefLocales` is the single source of truth: `FIELD_KEYS` is
`[industry, product_customers, tech_stack, size_stage]` and `LOCALES` is the
active UI locales, today `pl` and `en`. Both the prompt and the persistence
iterate over these, so adding a locale touches only this list.

`FakeBriefChatModel`, active in the test and dev profiles, returns deterministic
entries for every field and locale pair for a known company name, one entry with
`null` text for the insufficient case, and a configurable throw for the `FAILED`
test. The real adapter arrives in Step 2, and the domain never sees it.

### 1.5 `BriefService` (`@Transactional`)

```java
BriefResponse trigger(UUID userId, Long applicationId);      // POST
BriefResponse get(UUID userId, Long applicationId);          // GET
void editFields(UUID userId, Long applicationId, BriefEditRequest req);  // PUT
```

`trigger`:
1. `requireOwnedApplication(applicationId, userId)`, as in
   `ScreeningAnswerService`: `existsByIdAndUserId`, then `EntityNotFoundException`
   with `error.application.notFound`.
2. Read the company from the `Application`, then `findByUserIdAndCompanyName`:
   - exists and `READY` — return immediately, a cache hit with no model call;
   - exists and `PENDING` — do nothing, return the status;
   - exists and `FAILED` — reset to `PENDING` and re-run. This is the only retry
     path;
   - missing — save a new `PENDING`.
3. For a fresh `PENDING` or a retry, call
   `worker.generate(brief.getId(), company, application.getLink())` in the
   background.

`get` resolves the application's company, then its `CompanyBrief`. It returns the
status plus a `List<BriefFieldDto>`: for each `FIELD_KEYS` entry, a `texts` map
of language to text assembled from the rows, plus `edited`.

`editFields` resolves application to company to owned brief, then for each field
in the request writes the user's text to **all** `LOCALES` rows of that field and
sets `edited=true`. One user text shows in every language, per US-4.1. The edit
updates the company's brief, so the correction shows on every application to that
company.

### 1.6 `BriefGenerationWorker`

```java
@Async("briefExecutor")
public void generate(Long briefId, String companyName, String jobAdLink) {
    try {
        GeneratedBrief f = briefChatModel.generate(companyName, jobAdLink);  // the port
        markReady(briefId, f);        // one row per {fieldKey, lang}, edited=false, blank -> null
    } catch (Exception e) {
        markFailed(briefId);          // never a partial write
    }
}
```

This is a separate bean from `BriefService` on purpose: `@Async` only works
through the Spring proxy, so an `@Async` call to a method on the same object
would run synchronously. Generation only ever writes `edited=false` rows, and it
never runs for a `READY` brief, so it cannot overwrite a user edit.

### 1.7 `AsyncConfig`

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean("briefExecutor")
    public Executor briefExecutor() {
        var ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(2); ex.setMaxPoolSize(4);
        ex.setQueueCapacity(50); ex.setThreadNamePrefix("brief-");
        ex.initialize(); return ex;
    }
}
```

`@EnableAsync` lives in its own `@Configuration` with an explicitly named
executor, never on `ApplikonApplication` next to the web and security config.

The reason: `@EnableAsync` registers a bean-post-processor, a Spring component
built before normal beans. When it sits on the main configuration class it forces
other beans to initialise too early, which breaks `@AuthenticationPrincipal`
across all controllers — the principal arrives as `null`. Isolating it, and
naming an executor instead of using the default `SimpleAsyncTaskExecutor`, is the
standard wiring and keeps the request thread free.

### 1.8 `BriefController`

Follows the `ScreeningAnswerController` pattern.

```java
@PostMapping("/api/applications/{id}/brief")
ResponseEntity<BriefResponse> trigger(@AuthenticationPrincipal AuthenticatedUser user,
                                      @PathVariable Long id)      // 202 Accepted, body = status
@GetMapping("/api/applications/{id}/brief")
ResponseEntity<BriefResponse> get(...)                            // 200
@PutMapping("/api/applications/{id}/brief")
ResponseEntity<Void> editFields(..., @Valid @RequestBody BriefEditRequest req)   // 200
```

Edits are addressed through the application the user is looking at, which is
better UX, but they resolve to the company brief and write globally. Everything
is ownership-scoped through `user.id()` before any work happens.

### 1.9 DTOs

```java
record BriefResponse(String status, List<BriefFieldDto> fields) {}
record BriefFieldDto(String key, Map<String, String> texts, boolean edited) {}  // texts: lang -> text
record BriefEditRequest(List<Field> fields) { record Field(String fieldKey, String text) {} }
```

### 1.10 GDPR

- `UserExportService.buildExport` adds the user's **edited** brief fields — rows
  where `edited=true`, one per company and field, since every locale carries the
  same user text — as a `List<BriefFieldExport>`. Generated text is derived
  public data and is **not** exported. The `edited` flag is exactly what makes
  this separable without a second table.
- Deletion is covered by the foreign keys: deleting an account cascades from
  `users` to `company_briefs` to `company_brief_fields`. A brief is kept per
  company, so deleting a single application does not remove it or its edits.

### 1.11 i18n

`messages_pl.properties` and `messages_en.properties` get the status and
validation keys, such as `validation.brief.field.tooLong`. The "insufficient
info" marker is frontend-only and lands in Step 3.

### 1.12 Tests

`BriefServiceTest` and `BriefControllerTest`, running on the fake model with no
network:

- trigger produces `PENDING`, and after execution `READY`, with one row per field
  and locale, all `edited=false`;
- an entry with `null` text survives into `BriefResponse` as the insufficient
  marker;
- the response `texts` map carries every active locale, driven by `BriefLocales`,
  with no hard-coded `pl` or `en` assertions;
- a second application to the same company calls the fake **once**, asserted
  through a call counter, and returns `READY` immediately;
- when the fake throws, the brief is `FAILED`; retry works only from `FAILED` and
  does nothing for `READY` or `PENDING`;
- a foreign application raises `EntityNotFoundException` (404) before anything is
  written;
- `editFields` sets the user's text on every locale row with `edited=true`, and
  the same edit is visible from a second application to that company;
- the export contains edited fields only, not generated text;
- deleting an account clears both tables, and deleting one application leaves the
  brief and its edits intact.

**Done when** the full brief lifecycle works and is fully tested with no network
and no API keys.

**Checklist**
- [x] `V21`: `company_briefs` and `company_brief_fields`, one row per field and language, with the `edited` flag, foreign keys and unique keys
- [x] Entities and repository; `BriefLocales`; the `BriefChatModel` port and `FakeBriefChatModel`
- [x] `BriefService`: cache-aside reuse, idempotent trigger, retry only from `FAILED`, global `editFields`
- [x] `BriefGenerationWorker` running off the request thread
- [x] `POST`/`GET`/`PUT /api/applications/{id}/brief`, ownership-scoped
- [x] GDPR: edited fields in the export, cascade on account deletion, edits surviving a single-application delete
- [x] The fake-model test suite listed above, with `./mvnw test` green

## Step 2 — A live provider behind the same port

Swap the fake for the real provider. Configuration and prompt only, no domain
change.

The step is split in two. A first attempt landed the dependency and the adapter
together, tests broke, and the failure could not be attributed to either, so the
whole change was rolled back. Step 2a proves the classpath is safe; Step 2b adds
the adapter.

### Step 2a — the dependency alone

- `pom.xml`: the Spring AI BOM (1.1.x) and `spring-ai-starter-model-google-genai`,
  the starter that takes a free-tier API key (ADR-v2-001, cost 0). Not
  `vertex-ai-gemini`, which authenticates through GCP application default
  credentials and fails without a GCP project, including in tests.
- `src/test/resources/application-test.properties`: `spring.ai.model.chat=none`.
  The model auto-configuration activates from the classpath alone, in **every**
  profile, so `@Profile("!test")` on our adapter does not turn it off. Without a
  key its client bean fails context startup, and spring-dotenv reads `.env` in
  tests, so a developer's key would otherwise leak in silently.
- `.env.example`: the variable name only, never `.env`.

**Done when** `./mvnw test` is green with no other change, and tests are still
offline and keyless — verified once with `.env` temporarily renamed. If anything
fails here, the dependency is the cause, not our code.

**Checklist**
- [x] Spring AI BOM and `spring-ai-starter-model-google-genai` in `pom.xml`
- [x] `spring.ai.model.chat=none` in the test profile, with a comment saying why
- [x] `.env.example` updated
- [x] `./mvnw test` green, offline and independent of `.env`

### Step 2b — the adapter behind the port

- `GeminiBriefChatModel implements BriefChatModel`, `@Profile("!test")`. It
  builds the prompt from `BriefLocales`, asking for each field in each active
  locale in one request, with Google Search grounding enabled. Parsing is
  defensive: tolerate a markdown fence by extracting the outermost `{...}` into
  `GeneratedBrief` entries. Any provider error, partial or unparseable response
  raises an exception and ends as `FAILED`, never a partial brief (ADR-v2-001).
- **Timeout and retry go through client options or Spring AI's `RetryTemplate`
  only.** No `@EnableRetry`, no `@TimeLimiter`, no annotation-driven AOP. That
  kind of bean-post-processor is where the Step 1 `@AuthenticationPrincipal` bug
  came from, and the app adds none.
- The prompt instructs the model to use only verifiable public information, and
  if there is not enough, to set that field to `null` in **every** requested
  language rather than guess. The input is the company name plus the job-ad link
  when present, the link acting as a priority hint rather than a hard
  restriction. Nothing else, ever.
- Configuration comes from environment variables only, with separate dev and prod
  keys in separate Google projects. Verify the actual free-tier daily request
  limit in Google AI Studio for each.
- Unit tests keep running on the fake. No network in tests.

**Manual verification** on the dev machine with a dev key: a well-known company
gives four sensible fields in PL and EN; an obscure company gives explicit
insufficient-info fields with no hallucination; a removed or invalid key gives
`FAILED` with the core app unaffected.

**Done when** a real brief generates end to end on dev, `./mvnw test` is still
green offline, and the cost is zero.

**Checklist**
- [x] The adapter: web-grounded generation, client-side timeout, any error ending as `FAILED`
- [x] Structured output covering each field in each active locale, with per-field insufficient markers
- [x] The prompt sends only what the release allows to leave the system
- [x] No annotation-driven AOP added; timeout and retry live in the client config
- [x] Manual verification pass: known company, obscure company, dead key

## Step 3 — Frontend: the button, the states, the editing

**Build**
- `types/domain.ts`: `BriefStatus`, `BriefField { key; texts: Record<string, string>; edited }`,
  and `BriefResponse`. A field is picked as `texts[currentLang]`, where the
  component reads the current i18n locale rather than hard-coding `pl` or `en`.
- `services/api.ts`: `triggerBrief(id)`, `fetchBrief(id)`, `editBrief(id, fields)`.
- `hooks/useBrief.ts` with React Query. `useBrief(id)` polls while the status is
  `PENDING` through
  `refetchInterval: q => q.state.data?.status === 'PENDING' ? 2000 : false`,
  which stops on a terminal status and on unmount. Plus `useGenerateBrief` for
  the POST and `useEditBrief` for the PUT.
- The "About the company" section header gets a **Generate brief** button next to
  Add/Edit, in the header-action slot `CollapsibleSection` already provides. It
  is visually distinctive as the AI action, and appears on every application
  without a brief, including older ones.
- Section states: no brief shows the button; `PENDING` shows "generating…" with a
  spinner; `FAILED` shows an error and a "try again" button; `READY` renders the
  four fields as question-and-answer rows above "What do you know about us?".
  **No regenerate control ever appears for a ready brief.**
- Editing: the section's existing edit modal gains the four brief fields, and
  saving writes them with `PUT`. A field shows the text for the current app
  language, switching instantly, and an edited field shows the same user text in
  both. The edit updates the company's brief, so it shows on every application to
  that company.
- A field with no text and `edited=false` renders the explicit "not enough public
  info" marker, not a dash.
- i18n PL and EN for field labels, the button, the states and the marker.

**Tests** (vitest) — the button renders when there is no brief, including on old
applications; clicking it shows the generating state; `READY` renders four fields
in the current language and switches with it; `FAILED` shows try-again and
re-triggers; an edit saves and shows in both languages; an insufficient field
shows the marker; no regenerate control appears when `READY`.

**Done when** the full flow is clickable against the backend.

**Checklist**
- [x] Hooks and api wired to the three endpoints, polling while `PENDING`
- [x] Generate button in the section header next to Add/Edit, on every application without a brief
- [x] Section states: button, generating, failed with try-again, four question-and-answer rows; no regenerate when ready
- [x] Edit modal extended; the edit is global; edited text shows in both languages; the language switch is instant
- [x] Insufficient-info marker, with full i18n PL and EN
- [x] vitest, lint and build green

## Step 4 — Release chores

**Build**
- Cypress E2E: a stubbed happy path — open an application, generate, see the
  fields appear, edit one — through `data-cy`, language-independent.
- `spec/architecture.md`: the new tables, the endpoints, the asynchronous AI call
  and its trust boundary.
- `as-built.md`: a final pass over Steps 1 to 4.
- CHANGELOG entry for 2.1.0 and the version bumps in `package.json`, `pom.xml`
  and the README badge.
- Deploy per `spec/deployment/deployment-hetzner.md`, with the production API key
  set as an environment variable on the server, never committed, leaving the dev
  quota untouched.

**Done when** the brief is live on production, the CHANGELOG and versions are
consistent, and `npm run e2e` is green locally.

**Checklist**
- [x] E2E stubbed happy path through `data-cy`
- [x] `spec/architecture.md` and `as-built.md` updated
- [x] CHANGELOG `2.1.0` and version bumps
- [x] Deployed and verified live on production, with a production key separate from the dev one
- [x] Groq client bean: a blank key fails generation only, with a hard per-request timeout
- [x] ADR-v2-003, and the prompt and port drop the job-ad link
- [x] Per-offer generation parked in ADR-v2-003 §3
- [x] LinkedIn post
