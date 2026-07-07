# 2.0.0 — As-Built

> Differences between plan and what shipped, with why. Source of truth: the code.
> Shipped 2026-07-02 (topics `01-screening-companion`, `02-cheat-sheet-consolidation`).
> What exists now: [`../../architecture.md`](../../architecture.md).

## Deviations from plan

| Where | Planned | Built | Why |
|-------|---------|-------|-----|
| 01, Step 1 | Migration `V16` | `V17` | `V16__add_salary_field.sql` already existed |
| 01, Step 1 | `ScreeningAnswerRequest`/`Response` only | Added wrapper `ScreeningAnswersRequest` | Lets `@Valid` cascade to list items for a clean 400 on an over-long answer |
| 01, Step 3 | Per-application company knowledge as one `companyResearch` TEXT field + `PATCH .../company-research` (`V18`) | Per-application rows in `screening_answers` (`V19`); the `V18` column and endpoint dropped (`V20`) | One text field couldn't hold multiple custom questions — needed the same row model as "General". Full story: [`02-cheat-sheet-consolidation/brief.md`](02-cheat-sheet-consolidation/brief.md) |
| 02, Step 1 | Inline autosave everywhere | Read-only sections; editing opens a Save modal | Dogfooding: clearer than editing inline during a call |
| 02, Step 1 | Cheat sheet via per-card icon + details-header button | One hub tab (company picker) + default accordion section in details; per-card icon dropped | Scattered entry points were confusing; one hub is the recruiter-call fast path |

## Notes

- The "My answers" page (01, Step 2) was replaced by the cheat-sheet hub
  (02, Step 1); the backend resource is unchanged.
- Test-infra: switching the authenticated user mid-test after a `mockMvc.perform`
  doesn't take effect with the suite's thread-local `SecurityContextHolder`
  pattern — isolation tests switch the user once, before the request.
