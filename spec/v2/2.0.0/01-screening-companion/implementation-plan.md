# 2.0.0 01-screening-companion — Implementation Plan

> Steps with a testable Definition of Done. Sources: [`brief.md`](brief.md),
> [`user-stories.md`](user-stories.md). Grounded in the v1 code
> (`spec/architecture.md`). v2 runs on the v1 monolith — no new infrastructure.

**Key reuse / grounding (from the v1 code):**
- Applications already carry `status` and `appliedAt` (`@CreatedDate`); the
  frontend already loads all of them (`useApplications`) → **board cleanup is
  front-only** (stale computed client-side).
- Archiving reuses the existing `PATCH /api/applications/{id}/stage`
  (`updateApplicationStage` in `hooks/useApplications.ts`) with
  `{status: 'REJECTED', rejectionReason: 'NO_RESPONSE'}` — `EndModal.tsx` already
  uses this exact path, so no new endpoint.
- The only new backend is **"My answers"** (a new per-user resource).
- Patterns to follow: view tabs in `AppContent.tsx` (kanban/list/cv); banner
  styling from `components/notices/ServiceBanner.tsx`; user-scoped queries like
  `ApplicationRepository.findByUserId`; Flyway migration numbering continues at
  **V17** (V16 is taken by `add_salary_field`); i18n via the `common` namespace (PL/EN).

---

## Step 1 — Backend: "My answers" resource

New per-user screening answers (fixed template + custom questions).

**Build**
- `entity/ScreeningAnswer.java` — `id`, `user` (`@ManyToOne`), `questionKey`
  (nullable; stable key for fixed questions), `label` (nullable; used for custom),
  `answer` (TEXT, `@Size(max = 1000)`), `custom` (boolean), `sortOrder` (int),
  audit timestamps.
- `repository/ScreeningAnswerRepository.java` — `findByUserIdOrderBySortOrder`,
  `deleteByUserId`.
- `dto/ScreeningAnswerRequest.java` / `ScreeningAnswerResponse.java` (records).
- `service/ScreeningAnswerService.java` — `findByUser`, `save` (replace-all upsert
  for the user's set; simplest for autosave at this scale).
- `controller/ScreeningAnswerController.java` — `/api/screening-answers`:
  `GET` (list, current user) · `PUT` (save full set).
- `db/migration/V17__screening_answers.sql` — table `screening_answers`, FK
  `user_id → users(id) ON DELETE CASCADE`.
- RODO consistency: include screening answers in `UserExportService` and ensure
  they are removed in `UserService.deleteAccount` (cascade covers it; verify).

**Tests (JUnit + H2)**
- save then fetch returns the set for the user; ordering preserved.
- multi-user isolation: user A never sees user B's answers.
- answer > 1000 chars → 400.
- account deletion / export include screening answers.

**DoD**
- `GET`/`PUT /api/screening-answers` work, scoped to the JWT user.
- `./mvnw test` green.

**Checklist**
- [x] Entity `ScreeningAnswer` + `ScreeningAnswerRepository`
- [x] DTOs + `ScreeningAnswerService` (replace-all upsert; custom with blank label dropped)
- [x] Controller `GET`/`PUT /api/screening-answers` (JWT-scoped)
- [x] Migration `V17__screening_answers.sql` (FK `ON DELETE CASCADE`)
- [x] RODO: export + account deletion include screening answers
- [x] i18n validation message (PL/EN)
- [x] Tests green (`./mvnw test`)

---

## Step 2 — Frontend: "My answers" page

Covers US-1.1 / 1.2 / 1.3.

**Build**
- `types/domain.ts` — `ScreeningAnswer` + request shape.
- `services/api.ts` — `fetchScreeningAnswers`, `saveScreeningAnswers`.
- `hooks/useScreeningAnswers.ts` — React Query query + mutation; **debounced
  autosave** on edit.
- New view **`answers`** in `AppContent.tsx` (a new view tab next to
  kanban/list/cv) → `components/answers/MyAnswers.tsx`.
- Fixed template (**4 global questions**, labels via i18n keys): about-me ·
  why-changing · project · expected-salary. Each is a plain-text field, **max 1000
  chars** with a counter. *"What do you know about the company" is NOT here — it is
  per-application (`Application.companyResearch`), handled in Step 3.*
- Add / remove **custom** questions (label + answer); fixed ones not removable.
- **Empty state**: placeholder + **"Fill in your answers"** action.
- i18n: PL/EN strings + the 5 fixed labels (`common` namespace).

**Tests (vitest)**
- renders fixed template; typing triggers debounced save.
- add/remove custom question; empty custom label not saved.
- 1000-char cap + counter.

**DoD**
- User can fill, edit (autosave), and add/remove custom questions; reload shows
  saved content. `npm run test:run` + `npm run lint` green.

**Checklist**
- [x] `types/domain.ts` + `services/api.ts` (`fetchScreeningAnswers`, `saveScreeningAnswers`)
- [x] `hooks/useScreeningAnswers.ts` (query + mutation, debounced autosave)
- [x] `answers` view in `AppContent.tsx` + `components/answers/MyAnswers.tsx`
- [x] Fixed template (4 global questions) + add/remove custom questions
- [x] Empty state + 1000-char cap with counter
- [x] i18n PL/EN (strings + 5 fixed labels)
- [x] Tests + lint green

---

## Step 3 — Cheat sheet modal + per-application company note

Covers US-2.1 / US-2.2. Depends on Steps 1/2 (reads "My answers"). Adds **one
per-application field** (`Application.companyResearch`) — a scope addition agreed with
the user: most prep is global, but each application carries its own "what do you know
about this company" note.

**Build — backend (per-application `companyResearch`)**
- `entity/Application.java` — add `companyResearch` (`@Column(columnDefinition = "TEXT")`,
  `@Size(max = 1000)`).
- `db/migration/V18__application_company_research.sql` — `ALTER TABLE applications ADD
  COLUMN company_research TEXT`.
- Expose on `ApplicationResponse` (read) and accept an update. Editing is **inline +
  autosave** in the modal, so add a focused `PATCH /api/applications/{id}/company-research`
  (body `{ companyResearch }`) rather than forcing a full `PUT` — mirrors the existing
  `PATCH .../stage` pattern. Validate ≤1000 → 400.
- Already covered by the per-application export (it lives on the application); no RODO
  change beyond the new column travelling with the application.

**Build — frontend**
- `types/domain.ts` — `Application.companyResearch: string | null`; `services/api.ts`
  `updateCompanyResearch(id, value)`; a hook/mutation (reuse `useApplications`
  optimistic pattern) with **debounced autosave** (reuse the Step-2 debounce shape).
- `components/applications/CheatSheetModal.tsx` — opened by a **"Cheat sheet"** button
  in the `ApplicationDetails` header. Composes:
  1. **proposed salary for this application** — from the loaded application
     (`salary` / `salaryMin`–`salaryMax` + `currency` + `salaryType`); when none → **"—"**.
  2. **per-application "What do you know about this company"** — editable textarea
     (≤1000 + counter), autosaves to `companyResearch` for THIS application.
  3. **"My answers"** (read view) via `useScreeningAnswers`, with an **edit link**
     that switches to the `answers` view.
- Empty "My answers" → placeholder + **"Fill in your answers"** link.
- Modal closes on button / outside click / Esc. Available for **any** status (incl. finished).
- i18n PL/EN.

**Tests**
- Backend (JUnit + H2): `PATCH .../company-research` saves + returns; >1000 → 400;
  per-application isolation (editing app A leaves app B untouched); JWT-scoped.
- Frontend (vitest): composes salary + company field + answers; missing salary → "—";
  editing the company field autosaves for that application; empty answers → placeholder +
  link; opens/closes.

**DoD**
- One click opens the cheat sheet for any application with proposed salary +
  per-application company note (editable) + global "My answers" on one screen.
  `./mvnw test` and `npm run test:run` + `npm run lint` green.

**Checklist**
- [x] Backend: `Application.companyResearch` + `V18` migration + `PATCH .../company-research` (≤1000 → 400)
- [x] FE types/api/hook: `companyResearch` + `updateCompanyResearch` (debounced autosave)
- [x] `components/applications/CheatSheetModal.tsx` + "Cheat sheet" button in `ApplicationDetails`
- [x] Composes proposed salary (`—` when none) + editable company note + "My answers" read view with edit link
- [x] Empty answers → placeholder + "Fill in your answers" link
- [x] Closes on button / outside click / Esc; available for any status
- [x] i18n PL/EN
- [x] Backend + frontend tests + lint green

---

## Step 4 — Frontend: Board cleanup

Covers US-3.1 / 3.2. Front-only.

**Build**
- `utils/stale.ts` — `isStale(app)` = `status === 'SENT' && daysSince(appliedAt)
  > 60`.
- Stale **banner** at the top of the board (follow `ServiceBanner.tsx` styling)
  shown on load when ≥1 stale app, stating the count.
- On `ApplicationCard.tsx`: a stale indicator + **one-click archive** action →
  `updateApplicationStage({ status: 'REJECTED', rejectionReason: 'NO_RESPONSE' })`
  (reused hook). **Per card** — no bulk.
- After archiving, the card moves to `FINISHED` and the banner count recomputes
  (derived from query data; no persistent dismissal).
- i18n PL/EN.

**Tests (vitest)**
- `isStale` boundary: 60 days = not stale, > 60 = stale; non-`SENT` never stale.
- banner shows correct count and hides at zero.
- archive action calls `updateStage` with `REJECTED` + `NO_RESPONSE`.

**DoD**
- Stale apps (>60 days in `SENT`) get a banner + one-click archive that moves them
  to `FINISHED` as `NO_RESPONSE`. Tests + lint green.

**Checklist**
- [x] `utils/stale.ts` — `isStale(app)` (`SENT` && >60 days)
- [x] Stale banner on board load (count; hides at zero)
- [x] Per-card stale indicator + one-click archive (`REJECTED` + `NO_RESPONSE`)
- [x] Banner count recomputes after archive (no persistent dismissal)
- [x] i18n PL/EN
- [x] Tests + lint green

---

## Cross-cutting Definition of Done (whole version)

- [ ] All success criteria in `brief.md` §5 met.
- [ ] All new UI strings exist in PL **and** EN.
- [ ] Backend `./mvnw test` and frontend `npm run test:run` + `npm run build` green
  (matches CI).
- [ ] No new dependency, module split, or infrastructure introduced.
- [ ] One optional Cypress E2E happy path: fill "My answers" → open an application's
  cheat sheet → see them composed with the proposed salary.

---

## Suggested commit sequence (Conventional Commits)

1. `feat(backend): add screening answers resource (entity, repo, service, API, V17)`
2. `feat(frontend): add "My answers" screening template page`
3. `feat(backend): add per-application companyResearch field (V18, PATCH endpoint)`
4. `feat(frontend): add per-application cheat sheet modal`
5. `feat(frontend): add board cleanup for stale applications`
