# 2.0.0 02-cheat-sheet-consolidation — Implementation Plan

## Step 1 — UX consolidation: the cheat-sheet hub

No database change. This step reworks how the topic-01 features are surfaced.

**Build**
- **The cheat-sheet tab replaces the old answers tab** as the single preparation
  surface. It holds a company picker at the top (`Company - Position`) and two
  collapsible bars, each with an emoji and a colour: **About the company**
  (proposed salary plus "what do you know about us") and **General** (the global
  answers).
- Everything is read-only. **Edit** opens a modal with a Save button, following
  `ApplicationForm` — one modal for General, one for About the company. The
  salary Edit opens the application edit form. This replaces the old inline
  autosave.
- This is the fast path for the recruiter-call scenario: tab, pick company, read
  questions. The per-card cheat-sheet icon is removed, because users found it
  unintuitive.
- **Application details become an accordion** with icon and colour headers: Cheat
  sheet (open by default), Information, Job description, Notes.
  - The Cheat sheet section holds the same read-only content, without the picker
    since the company is already known, and the same Edit-opens-a-modal pattern.
  - The proposed salary is removed from Information. It lives only in the cheat
    sheet, shown as an editable question-style item.
  - The status badge becomes the change-status control. The separate button and
    the `⋮` menu item are dropped.
  - Status and stage collapse into one label, such as
    `In progress (Final interview)`.
- **Consistency pass:** one shared visual language in `prep.css` across the cheat
  sheet and details, consistent typography and spacing, short dashes everywhere,
  and the rename of "Global" to "General". "About the company" keeps its name and
  the tab is labelled "Cheat sheet".
- i18n PL and EN for everything new or changed.

**Tests** (vitest) — the picker selects a company; the cheat sheet renders
read-only and Edit opens the modal; the details accordion opens on Cheat sheet
and Information no longer shows the salary; the status badge opens the status
change.

**Done when** there is one cheat-sheet hub, editing happens only through modals,
details are a decluttered accordion, and the styling is consistent.

**Checklist**
- [x] Cheat-sheet tab: company picker plus collapsible About the company / General, read-only
- [x] Editing through modals for General and About the company; salary read-only in the cheat sheet
- [x] Details accordion with icon and colour headers; salary moved out of Information
- [x] Status badge changes the status; `In progress (Final interview)` as one label
- [x] Shared style and typography, short dashes, and the "Global" to "General" rename
- [x] i18n PL and EN; tests, lint and build green

## Step 2 — Per-application questions (`V19`)

Lets **About the company** carry its own custom questions, like General, instead
of a single note. This replaces the `companyResearch` field added in topic 01,
Step 3.

**Build — backend**
- `screening_answers` gains a nullable `application_id`, referencing
  `applications` with `ON DELETE CASCADE`. `NULL` means global (General), and a
  value means per application (About the company).
- `db/migration/V19__screening_answers_application_scope.sql` adds the column and
  an index on `(user_id, application_id)`. It is additive with no backfill: v2 is
  unreleased, so the old `companyResearch` column is not migrated into rows. It
  is dropped in `V20` instead.
- The service and API are extended to fetch and save answers **by scope**. The
  global scope filters on `application_id IS NULL`; the per-application scope
  verifies ownership through `existsByIdAndUserId`. Saving still replaces the
  whole set, but per scope, and one scope never touches the other.
- `ApplicationScreeningAnswerController` — `GET` and
  `PUT /api/applications/{id}/screening-answers`. The global endpoints do not
  change.

**Build — frontend**
- About the company uses the same "fixed plus add custom" editor as General,
  pointed at the selected application through new per-application hooks and API
  calls. The JSON shim `companyQuestions.ts` is deleted.

**Tests** — backend: per-application save and fetch, rejection of a foreign
application, and isolation from the global set. Frontend: adding and removing a
custom company question in the modal.

**Done when** About the company supports custom questions per application,
consistent with General. The Flyway migration is written once, at build time, and
is immutable after it has been applied.

`V20` then drops `applications.company_research` and removes the entity field,
the `ApplicationResponse` field, the export entry, the
`PATCH .../company-research` endpoint, its i18n keys and its tests. It runs only
after `V19` is verified green.

**Checklist**
- [x] About the company holds the fixed "What do you know about us?" plus the user's own custom questions
- [x] `V19`: `screening_answers.application_id`, the scoped repository and service, and the per-application controller
- [x] Frontend rewired onto the per-application endpoint; the JSON shim deleted
- [x] The same modal UX as General, with read-only question-and-answer rows on the cheat-sheet tab and in details
- [x] Frontend tests green; backend tests written and run with `./mvnw test`
- [x] `V20`: drop `applications.company_research` and everything that referenced it
- [x] Cypress E2E happy path in `cypress/e2e/cheat-sheet.cy.ts`, updated for the hub flow
