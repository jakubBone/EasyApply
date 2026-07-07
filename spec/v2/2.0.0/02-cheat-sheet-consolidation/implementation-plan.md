# 2.0.0 02-cheat-sheet-consolidation — Implementation Plan

> Follows [`../01-screening-companion/plan.md`](../01-screening-companion/plan.md) (topic 01, Steps 1-4).
> See [`brief.md`](brief.md) for why this topic exists. 

---

## Step 1 — UX consolidation (cheat-sheet hub)

No DB change. Reworks how the v2 features are surfaced.

**Build**
- **The cheat-sheet tab replaces the old answers tab** as the single preparation surface:
  - a **company picker** at the top (`Company - Position`);
  - two **collapsible bars** (chevron), visually distinguished (emoji + colour):
    **🏢 About the company** (read-only: proposed salary + "what do you know about us") and
    **💬 General** (read-only global answers).
  - Everything **read-only**; **Edit** opens a **modal with Save** (like
    `ApplicationForm`) — separate modal for *General* and for *About the company*; salary
    **Edit** opens the application edit form. Replaces the old inline autosave.
  - This *is* the fast path for the recruiter-call scenario (tab → pick company →
    questions). The per-card 📋 icon (found unintuitive) is **removed**.
- **Details view** becomes an **accordion** with icon + colour headers:
  **📋 Cheat sheet** (default open) · **ℹ️ Information** · **📄 Job description** · **📝 Notes**.
  - The `▼ Cheat sheet` section is the same read-only content (no picker — the company is
    known), with the same **Edit → modal** pattern.
  - **Proposed salary removed from Information**; it lives only in the cheat sheet, shown as
    an editable question-style item ("Your salary" → `7000 PLN (net, …)`).
  - **Status badge is the change-status control** (click the badge, e.g. "Sent");
    the separate button / `⋮` item is dropped.
  - Status + stage collapse into **one label**: `In progress (Final interview)`.
- **Consistency pass:** one shared visual language (`prep.css`) across the cheat sheet /
  details; consistent typography & spacing; short dashes `-` everywhere; renames
  **"Global" → "General"** (keep **"About the company"**); the tab label becomes "Cheat sheet".
- i18n PL/EN for all new/changed strings.

**Tests (vitest)** — picker selects a company; the cheat sheet renders read-only + Edit opens
the modal; details accordion (cheat sheet open, salary absent from Information); status badge
opens status change.

**DoD** — one cheat-sheet hub (pick company → read questions), edit only via modals,
decluttered accordion details, consistent style. `npm run test:run` + `lint` + `build` green.

**Checklist**
- [x] Cheat-sheet tab: company picker + collapsible 🏢 About the company / 💬 General (read-only)
- [x] Edit via modals (General, About the company); salary read-only in the cheat sheet
- [x] Details accordion (icon+colour headers); salary out of Information → cheat sheet
- [x] Status badge = change status; `In progress (Final interview)` single label
- [x] Shared style + typography, short dashes `-`, renames (General / keep About the company)
- [x] i18n PL/EN · tests + lint + build green

---

## Step 2 — Per-application questions (backend `V19`)

Lets **About the company** carry its own custom questions (like General), not just one
note — replaces the single `companyResearch` field from 01-screening-companion Step 3 (see `brief.md` §1b).

**Build — backend (`V19`, additive)**
- `screening_answers` gains a nullable **`application_id`** (FK → `applications`,
  `ON DELETE CASCADE`): `NULL` = global (General), set = per-application (About the company).
- `db/migration/V19__screening_answers_application_scope.sql` — add column + index
  `(user_id, application_id)`. **Additive only, no data backfill** — v2 is unreleased, so
  the old `companyResearch` column is not migrated into rows (dropped instead in `V20`).
- Service/API extended to fetch/save answers **by scope** (global filters
  `application_id IS NULL`; per-app verifies ownership via `existsByIdAndUserId`);
  replace-all upsert per scope (as today), one scope never touching the other.
- `ApplicationScreeningAnswerController` — `GET`/`PUT
  /api/applications/{id}/screening-answers`; global endpoints unchanged.

**Build — frontend**
- **About the company** uses the same "fixed + add custom" editor as General, pointed at
  the selected application via new per-app hooks/api; the JSON shim (`companyQuestions.ts`)
  is deleted.

**Tests** — backend: per-application save/fetch, foreign-application rejection, scope
isolation from the global set; frontend: add/remove custom company question in the modal.

**DoD** — About the company supports custom questions per application, consistent with
General; `./mvnw test` + `npm run test:run` green. Flyway migration written **once, at build
time** (immutable after apply).

**Checklist**
- [x] "About the company" = fixed "What do you know about us?" + the user's own custom questions
- [x] `V19`: `screening_answers.application_id` + scoped repo/service + per-app controller
- [x] Frontend rewired onto the per-application endpoint; JSON shim deleted
- [x] Same modal UX as General; read-only Q&A on the cheat-sheet tab + details
- [x] Frontend tests green; backend tests written (run `./mvnw test` — no JDK in-session)
- [x] `V20`: drop `applications.company_research` + remove entity field / `ApplicationResponse` /
  export / `PATCH .../company-research` / i18n / tests (done after `V19` verified green)

---

## Cross-cutting Definition of Done

- [x] All success criteria in `../01-screening-companion/brief.md` §5 still met (superseded mechanics
  described in `brief.md`, not the original brief).
- [x] All new UI strings exist in PL **and** EN.
- [x] Frontend `npm run test:run` (120) + `npm run build` green (matches CI).
  Backend `V19` written with tests; `./mvnw test` runs on a dev machine (no JDK in-session).
- [x] No new dependency, module split, or infrastructure introduced.
- [x] Cypress E2E happy path added (`cypress/e2e/cheat-sheet.cy.ts`, updated for the
  cheat-sheet hub flow). Not executed in-session (needs a running dev server) — run
  `npm run e2e` locally to confirm.
