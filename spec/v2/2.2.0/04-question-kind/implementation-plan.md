# 2.2.0 04-question-kind — Implementation Plan

> Topic 04 of the v2 era — follows
> [`../../2.1.0/03-company-brief/implementation-plan.md`](../../2.1.0/03-company-brief/implementation-plan.md) (topic 03).
> Why this release exists: [`brief.md`](brief.md) · decisions:
> [`user-stories.md`](user-stories.md).

**Working rhythm — a step is done only when:** its tests are green (frontend
verified in-session; backend `./mvnw test` on the dev machine — no JDK
in-session), its checklist below is ticked, and
[`../as-built.md`](../as-built.md) records what was actually built
(deviations go to as-built, never back into this file).

---

## 0. Shape — one attribute, two consumers

This release is deliberately small. The whole design is one decision:

| Aspect | Choice | Consequence |
|---|---|---|
| Where the kind lives | **A column on `screening_answers`**, not a new table | No join, no new repository, no new lifecycle. A question is still one row |
| Default for existing rows | **Column default `SCREENING`**, no backfill statement | Nothing is rewritten; the migration cannot corrupt data it does not touch |
| Who sets it | **The user, always** | No classifier, no heuristic, no AI surface — nothing to be wrong about |
| How the UI splits | **Client-side grouping of the set it already fetched** | No new endpoint, no second request, instant switching |

**Why a column and not a boolean:** `kind` names a closed set that will plausibly
grow (behavioural, system design), and an enum extends by one value. `isTechnical`
would have to be replaced the first time a third kind appears — and would read
badly in every query.

**Why no new endpoint:** the cheat sheet already fetches the full set for a scope
in one call. Filtering client-side keeps the switch instant and adds nothing to
the API surface. A server-side filter only starts paying off when a *model* is
querying across applications — which is exactly what the v3 era adds, and exactly
why it is not here.

---

## File map (what is created / changed)

**Backend — new**
```
db/migration/V22__screening_answer_kind.sql
entity/QuestionKind.java              (enum: SCREENING, TECHNICAL)
```
**Backend — changed:** `entity/ScreeningAnswer.java` (+ `kind`),
`dto/ScreeningAnswerRequest.java` (+ `kind`), `dto/ScreeningAnswerResponse.java`
(+ `kind`), `service/ScreeningAnswerService.java` (persist the field),
`service/UserExportService.java` + `dto/UserExportResponse.java` (+ `kind` on the
exported question), `messages_pl/en.properties`.

**Frontend — changed:** `types/domain.ts`, `hooks/useScreeningAnswers.ts`,
`components/prep/PrepReadonly.tsx`, `components/prep/CompanyQuestionsModal.tsx`,
`components/prep/GlobalAnswersModal.tsx`, `components/prep/globalAnswers.ts`,
`components/prep/prep.css`, `i18n/locales/{pl,en}/common.json`.

---

## Step 1 — Backend: the attribute

### 1.1 Migration `V22__screening_answer_kind.sql`
```sql
-- Every question is either a screening question or a technical one.
-- Existing rows are screening by definition: that is where they were before this release.
ALTER TABLE screening_answers
    ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'SCREENING';
```
`NOT NULL DEFAULT` does the whole backfill — **there is no `UPDATE` statement in
this migration**, so it cannot touch data it was not meant to. The default stays
on the column so a row inserted by any path (including a future one) is never
kind-less.

### 1.2 `QuestionKind` enum
```java
public enum QuestionKind { SCREENING, TECHNICAL }
```

### 1.3 `ScreeningAnswer` entity
```java
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 16)
private QuestionKind kind = QuestionKind.SCREENING;
```
`EnumType.STRING` matching the existing `ApplicationStatus` convention — the
database stays readable and reordering the enum can never re-label rows.

### 1.4 DTOs
```java
record ScreeningAnswerRequest(String questionKey, String label, String answer,
                              boolean custom, QuestionKind kind) {}
```
A **missing `kind` in the request deserializes to `null` and is persisted as
`SCREENING`** — the service applies the default rather than rejecting the request.
This keeps an older client (and every existing test fixture) working unchanged,
which is what makes this step non-breaking. `ScreeningAnswerResponse` always
returns a concrete kind; the frontend never has to handle `null`.

### 1.5 `ScreeningAnswerService`
`persist(...)` sets `entity.setKind(request.kind() == null ? SCREENING : request.kind())`.
Nothing else changes — **both scopes and the existing replace-all save behave
exactly as before**.

### 1.6 GDPR
`UserExportService`: the exported question carries its `kind`. It is part of a
user-written record, so it is exported with that record and removed with the
account. No new table means no new deletion path.

### 1.7 Tests (`ScreeningAnswerServiceTest`, `ScreeningAnswerControllerTest`)
- saving a question with `TECHNICAL` round-trips as `TECHNICAL`, in **both**
  scopes;
- saving with no `kind` in the payload stores `SCREENING` (the backwards-compatible
  path — assert explicitly, this is the guarantee that old clients keep working);
- editing a question's kind persists the change;
- the export contains `kind`;
- **regression:** the existing global / per-application save tests pass unchanged,
  proving the replace-all semantics were not disturbed.

**DoD** — the attribute round-trips through both scopes, old payloads still work,
`./mvnw test` green on the dev machine.

**Checklist**
- [ ] `V22`: `kind` column, `NOT NULL DEFAULT 'SCREENING'`, no `UPDATE` statement
- [ ] `QuestionKind` enum + entity field (`EnumType.STRING`)
- [ ] Request/response DTOs; missing `kind` → `SCREENING` in the service
- [ ] Export carries `kind`
- [ ] Test list above green (incl. the unchanged existing suite)
- [ ] as-built updated · checklist ticked

---

## Step 2 — Frontend: the split

**Build**
- `types/domain.ts`: `QuestionKind = 'SCREENING' | 'TECHNICAL'`; add `kind` to the
  screening-answer type.
- `hooks/useScreeningAnswers.ts`: pass `kind` through on save; **no new query** —
  the hook already returns the full set for a scope.
- `PrepReadonly.tsx`: the questions area becomes **two groups**, with the screening
  group open by default. The switch is client-side over data already in hand, so
  it is instant and never refetches.
- `CompanyQuestionsModal.tsx` / `GlobalAnswersModal.tsx`: each question row gains a
  **kind control** (two-option toggle), defaulting to screening for a new row.
- `globalAnswers.ts`: the fixed template questions are declared `SCREENING` —
  that is what they are (notice period, salary, English level).
- Empty group renders an explicit "nothing here yet" with the add action, never a
  blank area.
- i18n PL + EN for the group labels, the toggle, and the empty state.

**Tests (vitest)** — a technical question renders in the technical group and not in
the screening one; switching groups shows the other set without a refetch; a new
question defaults to screening; changing the toggle and saving persists the kind;
an empty group renders its explicit empty state; template questions land under
screening.

**DoD** — both groups usable against the backend; `npm run test:run` + `lint` +
`build` green (verified in-session).

**Checklist**
- [ ] Types + hook pass `kind` through (no new query)
- [ ] `PrepReadonly` splits into two groups, screening open by default
- [ ] Kind toggle in both modals; new questions default to screening
- [ ] Template questions declared `SCREENING`
- [ ] Explicit empty state per group + full i18n PL/EN
- [ ] vitest + lint + build green (in-session) · as-built updated · checklist ticked

---

## Step 3 — Release chores (2.2.0)

**Build**
- Cypress E2E: add a technical question to an application, switch groups, confirm
  it appears in one and not the other — via `data-cy`, language-independent.
- `spec/architecture.md`: the new column and the two-group cheat sheet.
- `../as-built.md`: final pass for Steps 1–3.
- CHANGELOG `2.2.0` (`feat` → minor) + version bump (`package.json`, `pom.xml`,
  README badge).
- Deploy per `spec/deployment/deployment-hetzner.md`.

**DoD** — deployed and working on prod; CHANGELOG/versions consistent;
`npm run e2e` green locally.

**Checklist**
- [ ] E2E happy path (`data-cy`)
- [ ] `spec/architecture.md` + `as-built.md` updated
- [ ] CHANGELOG `2.2.0` + version bumps
- [ ] Deployed; verified live on an account with pre-2.2.0 questions
- [ ] LinkedIn post (per release ritual)

---

## Cross-cutting Definition of Done

- [ ] All success criteria in [`brief.md`](brief.md) §5 met; all acceptance
  criteria in [`user-stories.md`](user-stories.md) hold.
- [ ] **No question is ever classified automatically** — the kind comes from the
  user or from the default, never from a guess.
- [ ] Every pre-2.2.0 question still shows, still edits, and reads as `SCREENING`.
- [ ] All new UI strings exist in PL **and** EN.
- [ ] Backend `./mvnw test` green (dev machine); frontend `test:run` + `lint` +
  `build` green (in-session); `npm run e2e` green locally.
- [ ] No new table, no new endpoint, no change to how answers are saved.
