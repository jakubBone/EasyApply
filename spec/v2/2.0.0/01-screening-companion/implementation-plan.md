# 2.0.0 01-screening-companion — Implementation Plan

## What this builds on

The release runs on the v1 monolith, so most of it is reuse:

- Applications already carry `status` and `appliedAt` (`@CreatedDate`), and the
  frontend already loads all of them through `useApplications`. Board cleanup is
  therefore **frontend only** — staleness is computed client-side.
- Archiving reuses the existing `PATCH /api/applications/{id}/stage` with
  `{status: 'REJECTED', rejectionReason: 'NO_RESPONSE'}`. `EndModal.tsx` already
  calls exactly this, so no new endpoint is needed.
- The only new backend resource is **"My answers"**.
- Patterns to follow: view tabs in `AppContent.tsx`, banner styling from
  `components/notices/ServiceBanner.tsx`, user-scoped queries like
  `ApplicationRepository.findByUserId`, and i18n through the `common` namespace.
  Flyway numbering continues at **V17**, because V16 is taken by
  `add_salary_field`.

## Step 1 — Backend: the "My answers" resource

A new per-user resource holding the fixed template plus custom questions.

**Build**
- `entity/ScreeningAnswer.java` — `id`, `user` (`@ManyToOne`), `questionKey`
  (nullable, a stable key for the fixed questions), `label` (nullable, used by
  custom ones), `answer` (TEXT, `@Size(max = 1000)`), `custom` (boolean),
  `sortOrder` (int), audit timestamps.
- `repository/ScreeningAnswerRepository.java` — `findByUserIdOrderBySortOrder`,
  `deleteByUserId`.
- `dto/ScreeningAnswerRequest.java` and `ScreeningAnswerResponse.java`, both
  records.
- `service/ScreeningAnswerService.java` — `findByUser` and `save`. Saving
  replaces the user's whole set, which is the simplest thing that works with
  autosave at this scale.
- `controller/ScreeningAnswerController.java` — `/api/screening-answers`, with
  `GET` to list the current user's set and `PUT` to save it.
- `db/migration/V17__screening_answers.sql` — the `screening_answers` table, with
  `user_id` referencing `users(id)` `ON DELETE CASCADE`.
- RODO: include screening answers in `UserExportService`, and confirm they are
  removed by `UserService.deleteAccount`. The cascade covers it, but verify.

**Tests** (JUnit and H2)
- Save, then fetch, returns the user's set with the ordering preserved.
- User A never sees user B's answers.
- An answer longer than 1000 characters returns 400.
- Account deletion and data export both include screening answers.

**Done when** `GET` and `PUT /api/screening-answers` work, scoped to the JWT
user.

**Checklist**
- [x] Entity `ScreeningAnswer` and `ScreeningAnswerRepository`
- [x] DTOs and `ScreeningAnswerService` (replace-all upsert; a custom question with a blank label is dropped)
- [x] Controller `GET`/`PUT /api/screening-answers`, JWT-scoped
- [x] Migration `V17__screening_answers.sql` with `ON DELETE CASCADE`
- [x] RODO: export and account deletion include screening answers
- [x] i18n validation message in PL and EN
- [x] Tests green (`./mvnw test`)

## Step 2 — Frontend: the "My answers" page

Covers US-1.1, US-1.2 and US-1.3.

**Build**
- `types/domain.ts` — the `ScreeningAnswer` type and the request shape.
- `services/api.ts` — `fetchScreeningAnswers` and `saveScreeningAnswers`.
- `hooks/useScreeningAnswers.ts` — a React Query query and mutation, with
  debounced autosave on edit.
- A new `answers` view in `AppContent.tsx`, next to kanban, list and cv, pointing
  at `components/answers/MyAnswers.tsx`.
- The fixed template of four questions, labelled through i18n keys: about-me,
  why-changing, project, expected-salary. Each is a plain-text field capped at
  1000 characters with a counter.
- Adding and removing custom questions (label plus answer). The fixed ones cannot
  be removed.
- Empty state: a placeholder and a "Fill in your answers" action.
- i18n PL and EN, including the fixed labels.

**Tests** (vitest) — the fixed template renders; typing triggers a debounced
save; a custom question can be added and removed; a custom question with an empty
label is not saved; the 1000-character cap and its counter work.

**Done when** the user can fill in answers, edit them with autosave, and add or
remove custom questions, and a reload shows the saved content.

**Checklist**
- [x] `types/domain.ts` and `services/api.ts` (`fetchScreeningAnswers`, `saveScreeningAnswers`)
- [x] `hooks/useScreeningAnswers.ts` (query, mutation, debounced autosave)
- [x] The `answers` view in `AppContent.tsx` plus `components/answers/MyAnswers.tsx`
- [x] Fixed template of four questions, plus adding and removing custom ones
- [x] Empty state, and the 1000-character cap with its counter
- [x] i18n PL and EN, including the fixed labels
- [x] Tests and lint green

## Step 3 — Cheat sheet modal and the per-application company note

Covers US-2.1 and US-2.2, and reads the answers from Steps 1 and 2.

This step adds one per-application field, `Application.companyResearch`. That is
a scope addition agreed with the user: most prep is global, but each application
needs its own "what do you know about this company" note.

**Build — backend**
- `entity/Application.java` — add `companyResearch`
  (`@Column(columnDefinition = "TEXT")`, `@Size(max = 1000)`).
- `db/migration/V18__application_company_research.sql` — add the
  `company_research` column.
- Expose it on `ApplicationResponse` and accept updates. Editing is inline with
  autosave, so add a focused `PATCH /api/applications/{id}/company-research`
  taking `{ companyResearch }` rather than forcing a full `PUT`. This mirrors the
  existing `PATCH .../stage`. Values over 1000 characters return 400.
- No RODO change beyond the new column travelling with the application, which the
  per-application export already covers.

**Build — frontend**
- `types/domain.ts` — `Application.companyResearch: string | null`;
  `services/api.ts` — `updateCompanyResearch(id, value)`; a mutation reusing the
  optimistic pattern from `useApplications`, with the same debounce shape as Step
  2.
- `components/applications/CheatSheetModal.tsx`, opened by a "Cheat sheet" button
  in the `ApplicationDetails` header. It composes:
  1. the proposed salary for this application, read from the loaded application
     (`salary` or `salaryMin`-`salaryMax`, plus `currency` and `salaryType`);
     when there is none, show "-",
  2. the per-application "What do you know about this company" textarea, capped
     at 1000 characters with a counter, autosaving to `companyResearch` for
     **this** application,
  3. the global "My answers" as a read view, with a link that switches to the
     `answers` view.
- Empty "My answers" shows a placeholder and a "Fill in your answers" link.
- The modal closes on the button, an outside click, and Esc. It is available for
  any status, including finished applications.
- i18n PL and EN.

**Tests**
- Backend — `PATCH .../company-research` saves and returns the value; over 1000
  characters returns 400; editing application A leaves application B untouched;
  the endpoint is JWT-scoped.
- Frontend — the modal composes salary, company field and answers; a missing
  salary renders "-"; editing the company field autosaves for that application;
  empty answers render the placeholder and link; the modal opens and closes.

**Done when** one click opens a cheat sheet for any application, showing the
proposed salary, the editable per-application company note, and the global "My
answers" on one screen.

**Checklist**
- [x] Backend: `Application.companyResearch`, the `V18` migration, and `PATCH .../company-research` returning 400 above 1000 characters
- [x] Frontend types, api and hook: `companyResearch` and `updateCompanyResearch` with debounced autosave
- [x] `components/applications/CheatSheetModal.tsx` and the "Cheat sheet" button in `ApplicationDetails`
- [x] Composes the proposed salary ("-" when none), the editable company note, and the read view of "My answers" with an edit link
- [x] Empty answers show a placeholder and a "Fill in your answers" link
- [x] Closes on the button, an outside click and Esc; available for any status
- [x] i18n PL and EN
- [x] Backend and frontend tests plus lint green

## Step 4 — Frontend: board cleanup

Covers US-3.1 and US-3.2. Frontend only.

**Build**
- `utils/stale.ts` — `isStale(app)` is `status === 'SENT' && daysSince(appliedAt) > 60`.
- A banner at the top of the board, styled after `ServiceBanner.tsx`, shown on
  load when at least one application is stale, stating the count.
- On `ApplicationCard.tsx`: a stale indicator and a one-click archive action
  calling `updateApplicationStage({ status: 'REJECTED', rejectionReason: 'NO_RESPONSE' })`.
  Per card, no bulk action.
- After archiving, the card moves to `FINISHED` and the banner count is
  recomputed from the query data. There is no persistent dismissal.
- i18n PL and EN.

**Tests** (vitest) — the `isStale` boundary (60 days is not stale, more than 60
is, and a non-`SENT` application is never stale); the banner shows the right
count and disappears at zero; the archive action calls `updateStage` with
`REJECTED` and `NO_RESPONSE`.

**Done when** stale applications get a banner and a one-click archive that moves
them to `FINISHED` as `NO_RESPONSE`.

**Checklist**
- [x] `utils/stale.ts` with `isStale(app)` (`SENT` and more than 60 days)
- [x] Stale banner on board load, with a count, hidden at zero
- [x] Per-card stale indicator and one-click archive (`REJECTED` plus `NO_RESPONSE`)
- [x] The banner count recomputes after archiving, with no persistent dismissal
- [x] i18n PL and EN
- [x] Tests and lint green
