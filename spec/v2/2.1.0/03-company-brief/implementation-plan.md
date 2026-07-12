# 2.1.0 03-company-brief — Implementation Plan

> Topic 03 of the v2 era — follows
> [`../../2.0.0/02-cheat-sheet-consolidation/implementation-plan.md`](../../2.0.0/02-cheat-sheet-consolidation/implementation-plan.md) (topic 02, Steps 1-2).
> Why this release exists: [`brief.md`](brief.md) · decisions:
> [`user-stories.md`](user-stories.md) · provider & trust boundary:
> [`../../../adr/ADR-001-gemini-free-tier-grounding.md`](../../../adr/ADR-001-gemini-free-tier-grounding.md).

**Working rhythm — a step is done only when:** its tests are green (frontend
verified in-session; backend `./mvnw test` on the dev machine — no JDK
in-session), its checklist below is ticked, and
[`../as-built.md`](../as-built.md) records what was actually built
(deviations go to as-built, never back into this file).

---

## 0. Shape — the market patterns this feature maps to

The feature is a composition of well-known patterns; the whole plan follows from
them:

| Aspect | Pattern | Design consequence |
|---|---|---|
| Slow, unreliable external call (LLM) while the UI must show "generating…" | **Asynchronous Request-Reply** (`POST` → 202 + status, `GET` to poll) | three endpoints, `status` in the DB, the frontend polls |
| Dependency on an AI provider that must be swappable and testable offline | **Ports & Adapters** (port `BriefChatModel`, Gemini adapter, Fake adapter) | the whole backend is built and tested against a fake — no keys to test |
| Expensive, repeatable result shared across applications to the same company | **Cache-aside per (user, company)** | one brief per company, reused across applications, dedup on a unique key |
| The user can correct a field on the company's brief | **Edit in place** (the edit updates the brief; an `edited` row flag marks user text) | two tables; the flag keeps the GDPR export honest |

**Language is data, not schema:** generated text is stored **one row per (field,
language)**, never in fixed `*_pl`/`*_en` columns. Adding a locale is a new `lang`
value + a prompt line — never a migration. The set of languages tracks the i18n
UI (today **PL + EN**); the prompt generates exactly the locales the UI supports,
read from the i18n locale list, not hard-coded.

The rest is standard hygiene: **idempotent trigger** (a double click never fires
two AI calls), **data egress minimization** (only company name + job-ad link ever
leave the system), **graceful degradation** (a provider error ends as a terminal
`FAILED`, the core app untouched).

---

## File map (what is created / changed)

**Backend — new**
```
db/migration/V21__company_briefs.sql
entity/CompanyBrief.java              entity/BriefStatus.java
entity/CompanyBriefField.java (one row per field × language; `edited` flag)
repository/CompanyBriefRepository.java   (fields ride along via the aggregate)
service/BriefService.java            service/BriefGenerationWorker.java
service/ai/BriefChatModel.java (port) service/ai/FakeBriefChatModel.java
service/ai/GeneratedBrief.java (record: list of {fieldKey, lang, text}; null text = insufficient)
service/ai/BriefLocales.java (field keys + active locales, one source of truth)
config/AsyncConfig.java
controller/BriefController.java
dto/BriefResponse.java  dto/BriefFieldDto.java  dto/BriefEditRequest.java
```
**Backend — changed:** `UserExportService.java` (+ edited brief fields),
`dto/UserExportResponse.java` (+ `BriefFieldExport`), `messages_pl/en.properties`,
`pom.xml` (Spring AI — Step 2).

**Frontend — new:** `hooks/useBrief.ts`, `components/prep/BriefSection.tsx`,
brief fields in the existing "About the company" edit modal.
**Frontend — changed:** `services/api.ts`, `types/domain.ts`, the "About the
company" section, `i18n/locales/{pl,en}/common.json`.

---

## Step 1 — Backend on `FakeBriefChatModel` (zero network, zero keys)

The whole resource, testable without any live AI: generation runs through the
`BriefChatModel` port and every test runs against a fake (ADR-001 §6 — this *is*
the swappability proof).

### 1.1 Migration `V21__company_briefs.sql` — two tables
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

CREATE TABLE company_brief_fields (                 -- one row per field × language
    id         BIGSERIAL PRIMARY KEY,
    brief_id   BIGINT      NOT NULL REFERENCES company_briefs(id) ON DELETE CASCADE,
    field_key  VARCHAR(32) NOT NULL,               -- industry|product_customers|tech_stack|size_stage
    lang       VARCHAR(8)  NOT NULL,               -- 'pl' | 'en' | … (whatever the UI supports)
    text       TEXT,                               -- NULL = "not enough public info"
    edited     BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE once the user overwrote it
    CONSTRAINT uq_brief_field UNIQUE (brief_id, field_key, lang)
);
```
`UNIQUE (user_id, company_name)` serves two roles: the cache key **and** the dedup
lock behind the idempotent trigger. All content — generated and edited — lives in
`company_brief_fields`, keyed by `(brief_id, field_key, lang)`; **the language is a
row value, so a new locale needs no schema change, and a new field is a new
`field_key`, not a migration**. `edited` separates the user's own text from derived
public data (see GDPR, §1.10).

### 1.2 Entities (`ScreeningAnswer` pattern — Lombok + `AuditingEntityListener` + `@OnDelete`)
- `BriefStatus` enum: `PENDING, READY, FAILED`.
- `CompanyBrief` (aggregate root): `@ManyToOne User user` (`@OnDelete CASCADE`),
  `String companyName`, `@Enumerated(STRING) BriefStatus status`,
  `@CreatedDate`/`@LastModifiedDate`, and
  `@OneToMany(mappedBy="brief", cascade=ALL, orphanRemoval=true) List<CompanyBriefField> fields`.
  Fields are persisted **through the aggregate** — so the feature needs **one
  repository**, not two.
- `CompanyBriefField`: `@ManyToOne CompanyBrief brief` (`@OnDelete CASCADE`),
  `String fieldKey`, `String lang`, `@Column(columnDefinition="TEXT") String text`,
  `boolean edited`. **NULL `text` (and `edited=false`) = "not enough public
  info"** — shown, never hidden, never a guess.

### 1.3 Repository
```java
interface CompanyBriefRepository extends JpaRepository<CompanyBrief, Long> {
    Optional<CompanyBrief> findByUserIdAndCompanyName(UUID userId, String companyName);
}
```
`company_brief_fields` has no own repository — rows are created, replaced and read
through the `CompanyBrief` aggregate (`fields` collection).

### 1.4 Provider port + fake
```java
public interface BriefChatModel {                 // service/ai
    GeneratedBrief generate(String companyName, String jobAdLink);
}
// one entry per field × locale; text == null = insufficient
public record GeneratedBrief(List<Field> fields) {
    public record Field(String fieldKey, String lang, String text) {}
}
```
`BriefLocales` (single source of truth): `FIELD_KEYS = [industry,
product_customers, tech_stack, size_stage]` and `LOCALES` = the active UI locales
(today `pl`, `en`). Both the prompt and the persistence iterate these — **adding a
locale touches only this list**, never the schema or the entity.

`FakeBriefChatModel` (`@Profile("test")` / dev): deterministic entries for every
`FIELD_KEYS × LOCALES` pair for a known name, one `null`-text entry for the
"insufficient" case, and a configurable throw (for the `FAILED` test). The Gemini
adapter arrives in Step 2 — **the domain never sees it**.

### 1.5 `BriefService` (`@Transactional`)
```java
BriefResponse trigger(UUID userId, Long applicationId);      // POST
BriefResponse get(UUID userId, Long applicationId);          // GET
void editFields(UUID userId, Long applicationId, BriefEditRequest req);  // PUT
```
`trigger`:
1. `requireOwnedApplication(applicationId, userId)` — as in `ScreeningAnswerService`
   (`existsByIdAndUserId` → `EntityNotFoundException` with `error.application.notFound`).
2. Read `company` from the `Application`. `findByUserIdAndCompanyName`:
   - exists & `READY` → return immediately (**cache-aside hit, no model call**);
   - exists & `PENDING` → no-op, return status;
   - exists & `FAILED` → reset to `PENDING`, re-run (**retry only from here**);
   - missing → `save` a new `PENDING`.
3. For a fresh `PENDING`/retry: `worker.generate(brief.getId(), company, application.getLink())`
   — in the background.

`get`: resolves the application's company → its `CompanyBrief`. Returns `status` +
`List<BriefFieldDto>` — per `FIELD_KEYS` entry a `texts` map `{lang → text}`
assembled from the `company_brief_fields` rows, plus `edited`.

`editFields`: resolves application → company → owned brief, then for each field in
the request writes the user's text to **all `LOCALES` rows** of that
`(brief, field_key)` and sets `edited=true`. One user text shows in every language
(user-stories §4). The edit updates the company's brief, so the correction shows on
every application to that company.

### 1.6 `BriefGenerationWorker` (a separate bean — `@Async` only works through the proxy)
```java
@Async("briefExecutor")
public void generate(Long briefId, String companyName, String jobAdLink) {
    try {
        GeneratedBrief f = briefChatModel.generate(companyName, jobAdLink);  // the port
        markReady(briefId, f);        // fill the brief's fields: one row per {fieldKey, lang}, edited=false, blank -> null
    } catch (Exception e) {
        markFailed(briefId);                            // never a partial write
    }
}
```
A separate bean from `BriefService` on purpose: an `@Async` self-invocation inside
the service would run synchronously. Generation only ever writes `edited=false`
rows; it never runs again for a `READY` brief, so it cannot clobber a user edit.

### 1.7 `AsyncConfig` — background execution wiring
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
`@EnableAsync` lives in its **own** `@Configuration` with an explicit named
executor (`@Async("briefExecutor")`) — **never** on `ApplikonApplication` next to
the web/security config. The advising bean-post-processor that `@EnableAsync`
registers forces premature bean initialization when it sits on the main
configuration, which breaks `@AuthenticationPrincipal` resolution across **all**
controllers (the principal is injected as `null`). Isolating it — plus an explicit
executor rather than the default `SimpleAsyncTaskExecutor` — is the standard,
production-correct wiring and keeps the request unblocked.

### 1.8 `BriefController` (`ScreeningAnswerController` pattern)
```java
@PostMapping("/api/applications/{id}/brief")
ResponseEntity<BriefResponse> trigger(@AuthenticationPrincipal AuthenticatedUser user,
                                      @PathVariable Long id)      // 202 Accepted, body = status
@GetMapping("/api/applications/{id}/brief")
ResponseEntity<BriefResponse> get(...)                           // 200
@PutMapping("/api/applications/{id}/brief")
ResponseEntity<Void> editFields(..., @Valid @RequestBody BriefEditRequest req)   // 200
```
Edits are addressed via the application the user is looking at (`{id}`) for UX, but
resolve to the company brief and write globally. All ownership-scoped through
`user.id()` (UUID) before any work happens.

### 1.9 DTOs (records)
```java
record BriefResponse(String status, List<BriefFieldDto> fields) {}
record BriefFieldDto(String key, Map<String, String> texts, boolean edited) {}  // texts: lang -> text
record BriefEditRequest(List<Field> fields) { record Field(String fieldKey, String text) {} }
```

### 1.10 GDPR
- `UserExportService.buildExport`: add the user's **edited** brief fields
  (`company_brief_fields` where `edited=true`, one per `(company, field)` since all
  locales carry the same user text) as `List<BriefFieldExport>`. Generated
  (`edited=false`) text is derived public data → **not** exported. The `edited`
  flag is exactly what makes this separable without a second table.
- Deletion: FK cascades cover it — deleting an account chains
  `users → company_briefs → company_brief_fields` (`ON DELETE CASCADE` all the
  way). A brief is kept per company, so deleting a single application does **not**
  remove it or its edits.

### 1.11 i18n
`messages_pl.properties` + `messages_en.properties`: status/validation keys
(e.g. `validation.brief.field.tooLong`). The "insufficient info" marker is
frontend-only (Step 3).

### 1.12 Tests (fake `BriefChatModel`, zero network) — `BriefServiceTest` + `BriefControllerTest`
- trigger → `PENDING` → after execution `READY`, one `company_brief_fields` row
  per `FIELD_KEYS × LOCALES` stored, all `edited=false`;
- a `null`-text entry survives to `BriefResponse` (insufficient marker);
- the response `texts` map carries every active locale, driven by `BriefLocales`
  (no hard-coded `pl`/`en` assertions in the service);
- **cache reuse:** a second application to the same company → fake called
  **once** (assert via a call counter in the fake), status `READY` immediately;
- fake throws → `FAILED`; retry allowed only from `FAILED`, no-op on `READY`/`PENDING`;
- foreign application → `EntityNotFoundException` (404) before anything is written;
- **global edit:** `editFields` sets the user's text on every locale row and
  `edited=true`; the same edit is visible from a second application to that company;
- export contains **edited** fields only, not generated text;
- deleting an account clears both tables; deleting one application leaves the
  brief (and edits) intact.

**DoD** — full brief lifecycle works and is fully tested with **zero network /
zero API keys**; `./mvnw test` green on the dev machine.

**Checklist**
- [x] `V21`: `company_briefs` + `company_brief_fields` (row per field × lang, `edited` flag; FKs, unique keys)
- [x] Entities + single repo; `CompanyBriefField` via the aggregate; `BriefLocales`; `BriefChatModel` port + `FakeBriefChatModel`
- [x] `BriefService`: cache-aside reuse, idempotent trigger, retry-from-`FAILED` only, global `editFields`
- [x] `BriefGenerationWorker` `@Async("briefExecutor")` + `AsyncConfig` (own `@Configuration`, not on the main class)
- [x] `POST`/`GET`/`PUT /api/applications/{id}/brief` (ownership-scoped)
- [x] GDPR: edited fields in export; cascade on account delete; edits survive single-application delete
- [x] Fake-`BriefChatModel` test suite (list above) — `./mvnw test` green (dev machine)
- [x] as-built updated · checklist ticked

---

## Step 2 — Live Gemini behind the same port

Swap the fake for the real provider — config and prompt only, no domain change.

**Build**
- `pom.xml`: Spring AI BOM + Gemini (2.5 Flash) starter.
- `GeminiBriefChatModel implements BriefChatModel` (`@Profile("!test")`): builds
  the prompt from `BriefLocales` (asks for each field in each active locale in one
  request), **Google Search grounding enabled**, a sensible call timeout, defensive
  parse (tolerate a markdown fence — extract the outermost `{...}`) into
  `GeneratedBrief` entries; any provider error / partial / unparseable response →
  exception → `FAILED` (never a partial brief, ADR-001 §3).
- Prompt: instruct "only verifiable public info; if insufficient → set that field
  to `null` in **every** requested language, never guess". Input is **company name
  + job-ad link when present** (link as a priority hint, not a hard restriction) —
  nothing else, ever.
- Config via env vars only: key name added to **`.env.example`** (never `.env`);
  **separate dev / prod keys (separate Google projects)** — verify the actual
  free-tier RPD in Google AI Studio for each.
- Unit tests keep running on the fake — **no network in tests**.

**Manual verification (dev machine, dev key)** — a well-known company → 4 sensible
fields in PL and EN; an obscure company → explicit insufficient-info fields, no
hallucination; provider key removed/invalid → `FAILED`, core app unaffected.

**DoD** — a real brief generates end-to-end on dev; `./mvnw test` still green
offline; cost 0.

**Checklist**
- [ ] Spring AI + `GeminiBriefChatModel` (grounding, timeout, error → `FAILED`)
- [ ] Structured output covering each field × active locale, with per-field insufficient markers
- [ ] Prompt sends company name + link only; link = priority hint
- [ ] `.env.example` updated; separate dev/prod keys; RPD verified in AI Studio
- [ ] Manual verification pass (known company / obscure company / dead key)
- [ ] as-built updated · checklist ticked

---

## Step 3 — Frontend: generate button, states, editing

**Build**
- `types/domain.ts`: `BriefStatus`, `BriefField { key; texts: Record<string, string>; edited }`,
  `BriefResponse`. The field is picked as `texts[currentLang]` — the component
  reads the current i18n locale, no `pl`/`en` hard-coding.
- `services/api.ts`: `triggerBrief(id)`, `fetchBrief(id)`, `editBrief(id, fields)`.
- `hooks/useBrief.ts` (React Query): `useBrief(id)` polls while `PENDING` via
  `refetchInterval: q => q.state.data?.status === 'PENDING' ? 2000 : false`
  (stops on a terminal state and on unmount); `useGenerateBrief` (POST);
  `useEditBrief` (PUT).
- **"About the company" section header** gets a **✨ "Generate brief"** button next
  to "Add/Edit" (the header-action slot `CollapsibleSection` already provides) —
  visually distinctive as *the* AI action (accent/gradient). Shown on **every
  application without a brief** (incl. pre-2.1.0 ones).
- States in the section: no brief → button · `PENDING` → "generating…" + spinner ·
  `FAILED` → error + **"try again"** · `READY` → the 4 brief fields render as
  Q&A-style rows **above** "What do you know about us?". **No regenerate control
  ever appears for a ready brief.**
- Editing: the section's existing edit modal gains the 4 brief fields; saving
  writes them (`PUT`). A field shows the text for the **current app language**
  (switching PL/EN switches instantly; an edited field shows the same user text in
  both). An edit updates the company's brief, so it shows on every application to
  that company.
- "Not enough public info" fields (`texts[lang]` null and not `edited`) render the
  explicit i18n marker, not `-`.
- i18n PL + EN for everything (field labels, button, states, marker).

**Tests (vitest)** — button renders when no brief (incl. old applications); click
→ generating state; `READY` renders 4 fields in the current language and switches
with it; `FAILED` shows try-again which re-triggers; edit saves and the text shows
in both languages; insufficient field shows the marker; no regenerate control when
`READY`.

**DoD** — full flow clickable against the backend; `npm run test:run` + `lint` +
`build` green (verified in-session).

**Checklist**
- [ ] Hooks/api wired to the three endpoints (poll while `PENDING`)
- [ ] ✨ Generate button in the section header next to Add/Edit, on every brief-less application
- [ ] Section states: button / generating / failed+try-again / 4 Q&A rows; no regenerate when ready
- [ ] Edit modal extended; global edit; edited text shows in both languages; language switch instant
- [ ] Insufficient-info marker + full i18n PL/EN
- [ ] vitest + lint + build green (in-session) · as-built updated · checklist ticked

---

## Step 4 — Release chores (2.1.0)

**Build**
- Cypress E2E: stubbed happy path (open application → generate → fields appear →
  edit one) via `data-cy`, language-independent.
- `spec/architecture.md`: new tables, endpoints, the async AI call and its trust
  boundary (link ADR-001).
- `../as-built.md`: final pass for Steps 1-4.
- CHANGELOG `2.1.0` (`feat` → minor) + version bump (`package.json`, `pom.xml`,
  README badge).
- Deploy per `spec/deployment/deployment-hetzner.md` (prod API key configured as
  an env var on the server, never committed; dev-key quota untouched).

**DoD** — working deploy with the brief live on prod; CHANGELOG/versions
consistent; `npm run e2e` green locally.

**Checklist**
- [ ] E2E stubbed happy path (`data-cy`)
- [ ] `spec/architecture.md` + `as-built.md` updated
- [ ] CHANGELOG `2.1.0` + version bumps
- [ ] Deployed; prod key separate from dev; verified live
- [ ] LinkedIn post (per release ritual)

---

## Cross-cutting Definition of Done

- [ ] All success criteria in [`brief.md`](brief.md) §5 met; all acceptance
  criteria in [`user-stories.md`](user-stories.md) hold.
- [ ] **Nothing generates without a user click**; a ready brief never regenerates.
- [ ] Only company name + job-ad link ever leave the system; cost 0 (free tier,
  separate dev/prod quota).
- [ ] All new UI strings exist in PL **and** EN.
- [ ] Backend `./mvnw test` green (dev machine); frontend `test:run` + `lint` +
  `build` green (in-session); `npm run e2e` green locally.
- [ ] No new infrastructure beyond the Spring AI dependency (no queue, no
  scheduler, no new deployable).
