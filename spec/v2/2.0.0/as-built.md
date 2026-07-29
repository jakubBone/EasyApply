# 2.0.0 — As-Built

Source of truth is the code. What exists now:
[`architecture.md`](../../architecture.md).

## 1. What shipped

Every question the candidate prepares lives in one table, `screening_answers`.
A row with `application_id = NULL` belongs to the user's global set ("General");
a row with an `application_id` belongs to that one application ("About the
company"). Both scopes hold a fixed template plus any custom questions the user
adds, and saving a scope replaces its whole set.

The user reads all of it in the **cheat-sheet hub**: a tab where they pick an
application and see two collapsible sections, About the company and General.
Everything is read-only, and editing opens a modal with a Save button. The same
content is the default-open section of application details, where the company is
already known so there is no picker. The proposed salary shows there too, as a
question-style row.

**Board cleanup** is entirely in the frontend. An application in `SENT` for more
than 60 days is stale, computed from data the board already has. A banner reports
how many there are, and each stale card archives in one click by reusing the
existing stage endpoint with `REJECTED` and `NO_RESPONSE`.

No new dependency, module or infrastructure was added.

## 2. Changed from plan

| Where | Planned | Built | Why |
|-------|---------|-------|-----|
| 01, Step 1 | Migration `V16` | `V17` | `V16__add_salary_field.sql` already existed |
| 01, Step 1 | `ScreeningAnswerRequest`/`Response` only | Added a wrapper, `ScreeningAnswersRequest` | Lets `@Valid` cascade into the list items, so an over-long answer returns a clean 400 |
| 01, Step 3 | Per-application company knowledge as one `companyResearch` TEXT field, with `PATCH .../company-research` (`V18`) | Per-application rows in `screening_answers` (`V19`); the `V18` column and its endpoint dropped (`V20`) | One text field could not hold multiple custom questions. It needed the same row model as General. This is what topic 02 exists for |
| 01, Step 2 | A "My answers" page | Replaced by the cheat-sheet hub in 02, Step 1 | The backend resource is unchanged; only the surface moved |
| 02, Step 1 | Inline autosave everywhere | Read-only sections, with editing in a Save modal | Using it for real showed that inline editing during a call is worse than an explicit save |
| 02, Step 1 | Cheat sheet reached by a per-card icon and a details-header button | One hub tab with a company picker, plus a default-open section in details; the per-card icon dropped | Scattered entry points were confusing. One hub is the fast path during a recruiter call |
| 01, Step 1 | Tests switch the authenticated user mid-test | Isolation tests switch the user once, before the request | The suite holds the user in a thread-local `SecurityContextHolder`, so a switch after `mockMvc.perform` has no effect |
