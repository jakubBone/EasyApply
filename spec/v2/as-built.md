# Applikon v2 — As-Built Documentation

> Living document. Describes the **actual implemented state** of Applikon v2
> (Screening Companion) as it is built. Source of truth: the code — this reflects
> what exists, not what was planned. Unlike the numbered plan files, this document
> has no phase number: it is updated continuously as phases land, mirroring
> [`../v1/as-built.md`](../v1/as-built.md).
>
> Original plan (Phases 1-4): [`03-plan/plan.md`](03-plan/plan.md) ·
> [`02-user-stories/user-stories.md`](02-user-stories/user-stories.md) ·
> [`01-brief/brief.md`](01-brief/brief.md).
> Later phases (5-6): [`04-cheat-sheet-consolidation/`](04-cheat-sheet-consolidation/)
> (its own `brief.md` + `plan.md`). Process: [`../PROCESS.md`](../PROCESS.md).
>
> **Update policy:** after each phase lands (tests green), tick its checklist in the
> relevant plan file and record here what was actually built. Deviations from plan
> are tracked in one place — §2 — not scattered across phase sections.

---

## 1. Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Backend: "My answers" resource | ✅ Built (2026-06-30) |
| 2 | Frontend: "My answers" page | ✅ Built (2026-06-30) |
| 3 | Per-application company note (single field) | ✅ Built (2026-06-30), superseded by Phase 6 — see §2 |
| 4 | Frontend: Board cleanup | ✅ Built (2026-06-30) |
| 5 | UX consolidation (cheat-sheet hub) — [`04-cheat-sheet-consolidation/`](04-cheat-sheet-consolidation/) | ✅ Built (2026-07-02) |
| 6 | Per-application questions in "About the company" — [`04-cheat-sheet-consolidation/`](04-cheat-sheet-consolidation/) | ✅ Built (2026-07-02) — `V19` backend; `companyResearch` removed in `V20` |

---

## 2. Plan vs Built — deviations

| Phase | Planned | Built | Why |
|-------|---------|-------|-----|
| 1 | Migration `V16` | `V17` | `V16__add_salary_field.sql` already existed |
| 1 | `ScreeningAnswerRequest`/`Response` only | Added wrapper `ScreeningAnswersRequest` | Lets `@Valid` cascade to list items for a clean 400 on an over-long answer |
| 3 → 6 | Per-application company knowledge as one `companyResearch` TEXT field + `PATCH .../company-research` (`V18`) | Replaced by per-application rows in `screening_answers` (`V19`), so the company section supports custom questions like "General" does; the `V18` column and its endpoint were then dropped (`V20`) | A single text field couldn't hold multiple custom questions — needed the same row-based model as "General". Full story: [`04-cheat-sheet-consolidation/brief.md`](04-cheat-sheet-consolidation/brief.md) |
| 5 | Inline autosave everywhere (matching Phase 1-3 UX) | Read-only sections; editing opens a **Save modal** | Requested by the user after dogfooding — clearer than editing inline during a call |
| 5 | Cheat sheet reachable via a per-card icon + a details-header button | One cheat-sheet hub tab (company picker) + the same content as the details' default accordion section; the per-card icon was dropped | Scattered entry points were confusing; one hub is the fast path for the recruiter-call scenario. Full story: [`04-cheat-sheet-consolidation/brief.md`](04-cheat-sheet-consolidation/brief.md) |

---

## 3. Phase 1 — Backend: "My answers" resource ✅

**Built (2026-06-30).** New per-user screening-answer resource (fixed template +
custom questions), exposed as a JWT-scoped REST resource, with replace-all save.

### Files

| File | What it is |
|------|------------|
| `entity/ScreeningAnswer.java` | Entity: `questionKey` (fixed) / `label` (custom) / `answer` (TEXT, `@Size(max=1000)`) / `custom` / `sortOrder` + `createdAt`/`updatedAt`; `@ManyToOne` user with `@OnDelete(CASCADE)` |
| `repository/ScreeningAnswerRepository.java` | `findByUserIdOrderBySortOrder`, `deleteByUserId` |
| `dto/ScreeningAnswerRequest.java` | Single answer in a save request (no client `sortOrder`) |
| `dto/ScreeningAnswersRequest.java` | Wrapper `{ answers: [...] }`; `@Valid` cascades to each item |
| `dto/ScreeningAnswerResponse.java` | Read model (incl. server-assigned `sortOrder`) |
| `service/ScreeningAnswerService.java` | `findByUser`; `save` = replace-all upsert, drops custom questions with blank label |
| `controller/ScreeningAnswerController.java` | `GET` / `PUT /api/screening-answers`, scoped to `AuthenticatedUser` |
| `db/migration/V17__screening_answers.sql` | Table + FK `user_id → users(id) ON DELETE CASCADE` + index |

### REST API

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/api/screening-answers` | — | `ScreeningAnswerResponse[]` (current user, ordered) |
| `PUT` | `/api/screening-answers` | `{ "answers": ScreeningAnswerRequest[] }` | saved `ScreeningAnswerResponse[]` |

### Behaviour notes

- **Replace-all upsert:** `PUT` deletes the user's existing set and re-inserts the
  incoming one; `sortOrder` is reassigned from position (0-based). Simplest correct
  strategy for debounced autosave at this scale.
- **Custom-with-blank-label dropped** server-side (US-1 edge case).
- **RODO:** answers are included in `UserExportService` / `UserExportResponse`
  (`screeningAnswers[]`) and removed on account deletion in `UserService.deleteAccount`
  (explicit `deleteByUserId`, plus DB-level `ON DELETE CASCADE`).
- **i18n:** `validation.screeningAnswer.answer.tooLong` added (PL + EN).

### Tests

- `service/ScreeningAnswerServiceTest` (3) — replace-all + reindex, blank-label drop, mapping/order.
- `controller/ScreeningAnswerControllerTest` (7) — save→fetch + order, replace-all,
  per-user isolation, 1000-char → 400, blank-label custom dropped, export includes
  answers, account deletion removes them.
- Full backend suite green: **127/127** (`./mvnw test`).

### Test-infra note

Switching the authenticated user **mid-test after a `mockMvc.perform`** does not take
effect cleanly with the thread-local `SecurityContextHolder` pattern used across the
suite (not a production concern — each real request carries its own JWT). The isolation
test therefore seeds user A's data via the service and switches user **once** before the
request, mirroring `DataIsolationTest`.

---

## 4. Phase 2 — Frontend: "My answers" page ✅

**Built (2026-06-30).** New `answers` view (tab next to kanban/list/cv) where the user
fills a fixed **4-question global** screening template plus their own custom questions,
with debounced autosave to the Phase 1 resource. (This view was later replaced by the
cheat-sheet hub in Phase 5; the underlying resource is unchanged.)

### Files

| File | What it is |
|------|------------|
| `types/domain.ts` | Added `ScreeningAnswer` (read model) + `ScreeningAnswerRequest` (wire shape, no `sortOrder`) |
| `services/api.ts` | `fetchScreeningAnswers` (`GET`), `saveScreeningAnswers` (`PUT`, body `{ answers }`) |
| `hooks/useScreeningAnswers.ts` | `useScreeningAnswers` query + `useSaveScreeningAnswers` mutation exposing `saveDebounced` (800 ms); `onSuccess` writes the saved set back into the cache |
| `components/answers/MyAnswers.tsx` | The view: fixed template merge, add/remove custom, empty state, 1000-char cap + counter, save status |
| i18n `pl`/`en` `common.json` | `nav.answers` + `answers.*` block (strings + the 4 fixed `answers.questions.<key>` labels) |

### Behaviour notes

- **Fixed template keys** (`FIXED_QUESTION_KEYS`): `about-me`, `why-changing`,
  `project`, `expected-salary` (**4 global** questions). Labels via i18n, dynamic key
  cast with `as unknown as ParseKeys` (same pattern as `BadgeWidget`).
- **Local state vs cache:** the component keeps an editable `items` copy initialized
  **once** from the query, so an in-flight save never clobbers what the user is typing.
  Server data merges into the fixed template by `questionKey`; custom answers append.
- **Empty state:** when nothing is filled and the user hasn't started, shows a
  placeholder + **"Fill in your answers"** that reveals the template.
- **1000-char cap:** `maxLength` on the textarea **and** a `slice(0, 1000)` guard
  (covers programmatic/paste paths), with a per-field `length/1000` counter.

### Tests

- `test/hooks/useScreeningAnswers.test.tsx` (2) — query fetch; debounce collapses
  rapid calls into one save (fake timers).
- `test/components/MyAnswers.test.tsx` (5) — empty state → reveal template; renders
  directly when answers exist; typing triggers save; add/remove custom; 1000-char cap + counter.
- Full frontend suite green: **112/112** (`npm run test:run`); `npm run lint` and
  `npm run build` green.

---

## 5. Phase 3 — Per-application company note ✅ (superseded)

**Built (2026-06-30), replaced by Phase 6 (2026-07-02).** Added a single
per-application `companyResearch` field, exposed via a focused `PATCH` endpoint and
edited inline in a `CheatSheetModal`. Both the field and the modal were later removed
— see §2 for what replaced them and §9 for the current mechanism, and
[`04-cheat-sheet-consolidation/brief.md`](04-cheat-sheet-consolidation/brief.md) for
why. Nothing from this phase remains in the codebase; kept here as the historical
record of what shipped at the time.

---

## 6. Phase 4 — Board cleanup ✅

**Built (2026-06-30).** Front-only. Surfaces applications stuck in `SENT` >60 days and
offers a per-card one-click archive as `REJECTED` / `NO_RESPONSE` (v1 enums).

### Files

| File | What it is |
|------|------------|
| `utils/stale.ts` | `isStale(app)` (`SENT` && `daysSince(appliedAt) > 60`), `STALE_THRESHOLD_DAYS`, `daysSince`, `ARCHIVE_STALE_PAYLOAD` |
| `components/kanban/StaleBanner.tsx` | Top-of-board banner; renders nothing at zero |
| `components/kanban/KanbanBoard.tsx` | Computes `staleCount` from the live props and renders `<StaleBanner>` above the board |
| `components/kanban/ApplicationCard.tsx` | Per-card stale badge + "Archive" button → `onStageChange(id, ARCHIVE_STALE_PAYLOAD)` |
| `components/kanban/KanbanBoard.css` | Banner (amber) + card stale badge/archive styles |
| i18n `pl`/`en` `common.json` | `stale.*` (`banner` with `{{n}}`, `cardBadge`, `archive`) |

### Behaviour notes

- **No new endpoint** — archiving reuses the existing `PATCH .../stage` via the board's
  `onStageChange` (→ `useUpdateStage`, optimistic). The card moves to `FINISHED`.
- **Banner count is derived** from the query data each render, so after an archive the
  app is no longer `SENT` → `isStale` false → count recomputes. **No persistent
  dismissal** (recomputed on every board load), matching US-3.2.
- **Per card, no bulk.** The archive button `stopPropagation`s so it never opens details.
- **Boundary:** exactly 60 days is not stale; strictly `> 60` is (`daysSince > 60`).
- `{{n}}` is used instead of i18next's magic `count` to avoid pulling in plural-form keys.

### Tests

- `test/utils/stale.test.ts` (4) — 60d not stale / >60 stale / 59d not stale (fake clock);
  non-`SENT` never stale.
- `test/components/StaleBanner.test.tsx` (2) — shows count; renders nothing at zero.
- `test/components/ApplicationCardStale.test.tsx` (2) — stale card archives with
  `REJECTED` + `NO_RESPONSE`; fresh `SENT` card shows no archive action.
- Frontend suite: **125/125** (`npm run test:run`); `lint` + `build` green.

---

## 7. v2 status

Phases 1-6 built. Re-verified 2026-07-03: frontend **120/120** (`npm run test:run`),
`lint` and `build` green. Backend is **not compiled in this workspace (no JDK)**;
`./mvnw test` needs to be run on a dev machine to confirm.
**v2 is not yet released** — no CHANGELOG entry, app version is still `1.1.0`, no
deploy. (Main `README.md`'s feature list was updated 2026-07-03 to mention the
cheat sheet and board cleanup — the remaining release chores are CHANGELOG, version
bump, `npm run e2e`, and deploy.)

---

## 8. Phase 5 — UX consolidation (cheat-sheet hub) ✅

**Built (2026-07-02).** Consolidates the preparation surfaces into a single hub: one
cheat-sheet tab with a company picker, plus the same content as the default accordion
section in application details. No backend change. Plan + rationale:
[`04-cheat-sheet-consolidation/`](04-cheat-sheet-consolidation/).

### Design

- **One cheat-sheet hub replaces the earlier answers tab.** Pick a company at the top,
  then read its prep in two collapsible bars: **🏢 About the company** (accent teal) and
  **💬 General** (accent violet). This tab is the recruiter-call fast path.
- **Everything read-only; editing is a modal with Save** (like the app form), never
  inline. Global answers → `GlobalAnswersModal`; company prep → `CompanyQuestionsModal`
  (§9). Salaries/notes read as `-` when empty.
- **Details screen is an accordion** with icon + colour headers: **📋 Cheat sheet** (open) ·
  **ℹ️ Information** · **📄 Job description** · **📝 Notes**. The **status badge itself is
  the change-status control** (click "Sent…"), and status + stage collapse into one
  label, e.g. **"In progress (Final interview)"**. Proposed **salary moved out of
  Information** into the cheat-sheet section as a question-style row.
- Short dashes `-` throughout; one shared visual language (`prep.css`).

### Files

| File | What it is |
|------|------------|
| `components/cheatsheet/CheatSheet.tsx` | The cheat-sheet tab: company picker + two collapsible bars (read-only) + edit-modal triggers |
| `components/prep/CollapsibleSection.tsx` | Accordion; takes `icon`, `accent` (colour — also tints the inside Q&A), a header `action` slot, and a `dataCy` hook |
| `components/prep/PrepReadonly.tsx` | `CompanyPrepReadonly` (salary + company Q&A) and `GlobalAnswersReadonly` — shared by the tab and the details accordion |
| `components/prep/GlobalAnswersModal.tsx` | Modal editor for global answers (fixed + custom, Save) |
| `components/prep/globalAnswers.ts` | Shared template logic (`FIXED_QUESTION_KEYS`, `buildItems`, …) extracted from the old page |
| `components/applications/ApplicationDetails.tsx` | Rebuilt as accordions; clickable status badge; combined status+stage label; salary read-only in the cheat-sheet section |
| `utils/salary.ts` | Extracted `formatSalary` (shared by tab + details) |
| i18n `pl`/`en` | `nav.answers` → "Cheat sheet"; new `cheatSheet.*` (sections, edit, salaryQuestion, modal titles); `details.sectionCheat`/`sectionNotes` |
| *removed* | `answers/MyAnswers.*`, `applications/CheatSheetModal.*`, `prep/CompanyNoteField.tsx` + their tests |

### Tests

- Frontend suite **119/119** at this point (added `CheatSheet.test.tsx`; removed the
  deleted components' tests); `lint` + `build` green; `tsc --noEmit` unchanged at the
  repo's 13 pre-existing errors (none in the new files).

---

## 9. Phase 6 — Per-application questions in "About the company" ✅

**Built (2026-07-02).** "About the company" holds a fixed "What do you know about us?"
question **plus the user's own custom questions**, scoped to one application — the
same shape as "General". Plan + rationale:
[`04-cheat-sheet-consolidation/`](04-cheat-sheet-consolidation/).

### Backend (`V19`, additive)
- `db/migration/V19__screening_answers_application_scope.sql` — adds
  `screening_answers.application_id BIGINT` (nullable FK → `applications(id)`
  `ON DELETE CASCADE`) + index `(user_id, application_id)`. A **NULL** `application_id`
  is a global "General" row (unchanged); a set value scopes the row to one application.
- `entity/ScreeningAnswer.java` — nullable `@ManyToOne Application application`
  (`@OnDelete(CASCADE)`).
- `repository/ScreeningAnswerRepository.java` — scoped finders/deletes
  (`…ApplicationIdIsNull…` for global, `…ApplicationId…` for per-app). The existing
  "all rows" `findByUserIdOrderBySortOrder` / `deleteByUserId` are **kept** — the GDPR
  export and account deletion intentionally cover both scopes.
- `service/ScreeningAnswerService.java` — global find/save now filter
  `application_id IS NULL`, so per-app rows never leak into the global set and saving one
  scope never wipes the other. New `findByUserAndApplication` / `saveForApplication` each
  verify the application belongs to the user (`existsByIdAndUserId`) before touching rows.
- `controller/ApplicationScreeningAnswerController.java` — `GET`/`PUT
  /api/applications/{id}/screening-answers`; the global `/api/screening-answers` endpoints
  are unchanged.
- Tests: `ScreeningAnswerServiceTest` updated for the scoped calls + two new cases
  (per-app scope is set on save; a foreign application is rejected).

### `companyResearch` (`V18`) — removed in `V20`
`V19` shipped and was verified green (backend tests + runtime save), then a **second
commit** (`V20`) dropped `applications.company_research` and everything hanging off it:
the entity field, the `ApplicationResponse` / `UserExportResponse` fields,
`updateCompanyResearch` + `PATCH .../company-research`, the
`validation.companyResearch.tooLong` i18n keys, and the `ApplicationControllerTest` cases.
Splitting the destructive drop from the feature kept each step independently verifiable.

### Frontend
- `useApplicationScreeningAnswers` / `useSaveApplicationScreeningAnswers` hooks +
  `fetchApplicationScreeningAnswers` / `saveApplicationScreeningAnswers` api calls, wired
  onto the per-application endpoint.
- `prep/CompanyQuestionsModal.tsx` and `prep/PrepReadonly.tsx` read/write per-application
  screening answers (fixed `company-knowledge` key + custom questions); the modal seeds
  its editor only once the set has loaded, so custom questions are never lost. The editor
  stays **visually identical to the global answers modal** (fixed question + add/remove
  custom, Save). `FIXED_COMPANY_KEY` lives in `prep/globalAnswers.ts`.

### Verification
- Frontend **120/120** (`npm run test:run`); `lint` + `build` green; `tsc` unchanged
  (13 baseline, none in touched files).
- Backend **not compiled in this workspace (no JDK)** — `./mvnw test` runs on a dev
  machine.

### Also in this pass (cheat-sheet polish)
- Section edit reads **"Add/Edit"**; ⋮ delete gets **🗑️**.
- "Your salary" is read-only; general questions dropped "expected salary" (it lives in
  "About the company" now); the company question is **"What do you know about us?"**.
- Details status: **"In progress" always opens the stage picker** (so the stage can be
  changed even when already in progress); the status dialog is a **centered modal on
  desktop, bottom-sheet on mobile**.
- Readability: Q&A and Information rows as rounded cards; bigger sub-headers; custom
  question titles render black/bold; "Add question" is a filled button; each section's
  Q&A cards are tinted with the section accent (teal / violet).
- **E2E:** `cypress/e2e/cheat-sheet.cy.ts` — a stubbed happy path (pick company → read
  prep → add a company question), written language-independent via `data-cy` hooks.
