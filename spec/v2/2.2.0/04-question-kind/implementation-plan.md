# 2.2.0 04-question-kind — Implementation Plan

## Design in one page

This release is deliberately small. The whole design is one decision.

| Question | Choice | Consequence |
|---|---|---|
| Where the kind lives | A column on `screening_answers`, not a new table | No join, no new repository, no new lifecycle. A question is still one row |
| What happens to existing rows | A column default of `SCREENING`, with no backfill statement | Nothing is rewritten, so the migration cannot corrupt data it does not touch |
| Who sets it | The user, always | No classifier, no heuristic, no AI surface, nothing to be wrong about |
| How the UI splits | Client-side grouping of the set it already fetched | No new endpoint, no second request, instant switching |

**Why a column and not a boolean.** `kind` names a closed set that will plausibly
grow, for example with behavioural or system-design questions, and an enum
extends by one value. `isTechnical` would have to be replaced the first time a
third kind appeared, and it would read badly in every query.

**Why no new endpoint.** The cheat sheet already fetches the full set for a scope
in one call. Filtering client-side keeps the switch instant and adds nothing to
the API surface. A server-side filter only starts to pay off when a *model*
queries across applications, which is what the v3 era adds, and exactly why it is
not here.

## What changes

**Backend, new**
```
db/migration/V22__screening_answer_kind.sql
entity/QuestionKind.java              (enum: SCREENING, TECHNICAL)
```

**Backend, changed:** `entity/ScreeningAnswer.java`,
`dto/ScreeningAnswerRequest.java`, `dto/ScreeningAnswerResponse.java`,
`service/ScreeningAnswerService.java`, `service/UserExportService.java`,
`dto/UserExportResponse.java`, `messages_pl/en.properties`.

**Frontend, changed:** `types/domain.ts`, `hooks/useScreeningAnswers.ts`,
`components/prep/PrepReadonly.tsx`, `components/prep/CompanyQuestionsModal.tsx`,
`components/prep/GlobalAnswersModal.tsx`, `components/prep/globalAnswers.ts`,
`components/prep/prep.css`, `i18n/locales/{pl,en}/common.json`.

## Step 1 — Backend: the attribute

### 1.1 Migration `V22__screening_answer_kind.sql`

```sql
-- Every question is either a screening question or a technical one.
-- Existing rows are screening by definition: that is where they were before this release.
ALTER TABLE screening_answers
    ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'SCREENING';
```

`NOT NULL DEFAULT` does the whole backfill, so there is **no `UPDATE` statement
in this migration** and it cannot touch data it was not meant to. The default
stays on the column, so a row inserted by any path, including a future one, is
never without a kind.

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

`EnumType.STRING` matches the existing `ApplicationStatus` convention: the
database stays readable, and reordering the enum can never re-label rows.

### 1.4 DTOs

```java
record ScreeningAnswerRequest(String questionKey, String label, String answer,
                              boolean custom, QuestionKind kind) {}
```

A missing `kind` in the request deserializes to `null` and is persisted as
`SCREENING`. The service applies the default rather than rejecting the request,
which keeps an older client and every existing test fixture working unchanged.
That is what makes this step non-breaking. `ScreeningAnswerResponse` always
returns a concrete kind, so the frontend never has to handle `null`.

### 1.5 `ScreeningAnswerService`

`persist(...)` sets `entity.setKind(request.kind() == null ? SCREENING : request.kind())`.
Nothing else changes: both scopes and the existing replace-all save behave
exactly as before.

### 1.6 GDPR

`UserExportService`: the exported question carries its `kind`. It is part of a
user-written record, so it is exported with that record and removed with the
account. No new table means no new deletion path.

### 1.7 Tests

`ScreeningAnswerServiceTest` and `ScreeningAnswerControllerTest`:

- saving a question as `TECHNICAL` round-trips as `TECHNICAL`, in **both**
  scopes;
- saving with no `kind` in the payload stores `SCREENING`. Assert this
  explicitly, because it is the guarantee that old clients keep working;
- editing a question's kind persists the change;
- the export contains `kind`;
- regression: the existing global and per-application save tests pass unchanged,
  proving the replace-all semantics were not disturbed.

**Done when** the attribute round-trips through both scopes and old payloads
still work.

**Checklist**
- [ ] `V22`: the `kind` column, `NOT NULL DEFAULT 'SCREENING'`, no `UPDATE` statement
- [ ] `QuestionKind` enum and the entity field, using `EnumType.STRING`
- [ ] Request and response DTOs; a missing `kind` becomes `SCREENING` in the service
- [ ] The export carries `kind`
- [ ] The test list above is green, including the unchanged existing suite

## Step 2 — Frontend: the split

**Build**
- `types/domain.ts`: `QuestionKind = 'SCREENING' | 'TECHNICAL'`, and `kind` added
  to the screening-answer type.
- `hooks/useScreeningAnswers.ts`: pass `kind` through on save. **No new query** —
  the hook already returns the full set for a scope.
- `PrepReadonly.tsx`: the questions area becomes two groups, with the screening
  group open by default. The switch happens over data already in hand, so it is
  instant and never refetches.
- `CompanyQuestionsModal.tsx` and `GlobalAnswersModal.tsx`: each question row
  gains a kind control, a two-option toggle, defaulting to screening for a new
  row.
- `globalAnswers.ts`: the fixed template questions are declared `SCREENING`,
  which is what they are — notice period, salary, English level.
- An empty group renders an explicit "nothing here yet" with the add action,
  never a blank area.
- i18n PL and EN for the group labels, the toggle and the empty state.

**Tests** (vitest) — a technical question renders in the technical group and not
in the screening one; switching groups shows the other set without a refetch; a
new question defaults to screening; changing the toggle and saving persists the
kind; an empty group renders its explicit empty state; template questions land
under screening.

**Done when** both groups are usable against the backend.

**Checklist**
- [ ] Types and hook pass `kind` through, with no new query
- [ ] `PrepReadonly` splits into two groups, screening open by default
- [ ] Kind toggle in both modals; new questions default to screening
- [ ] Template questions declared `SCREENING`
- [ ] An explicit empty state per group, with full i18n

## Step 3 — Release chores

**Build**
- Cypress E2E: add a technical question to an application, switch groups, and
  confirm it appears in one and not the other. Through `data-cy`, so it is
  language-independent.
- `spec/architecture.md`: the new column and the two-group cheat sheet.
- `as-built.md`: a final pass over Steps 1 to 3.
- CHANGELOG entry for 2.2.0 and version bumps in `package.json`, `pom.xml` and
  the README badge.
- Deploy per `spec/deployment/deployment-hetzner.md`.

**Done when** it is deployed and working on production, the CHANGELOG and
versions are consistent, and `npm run e2e` is green locally.

**Checklist**
- [ ] E2E happy path (`data-cy`)
- [ ] `spec/architecture.md` and `as-built.md` updated
- [ ] CHANGELOG `2.2.0` and version bumps
- [ ] Deployed, and verified live on an account holding pre-2.2.0 questions
- [ ] LinkedIn post
