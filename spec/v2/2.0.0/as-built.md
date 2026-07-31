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
| Step 1 | Migration `V16` | `V17` | `V16__add_salary_field.sql` already existed |
| Step 1 | `ScreeningAnswerRequest`/`Response` only | Added wrapper `ScreeningAnswersRequest` | Lets `@Valid` cascade into list items for clean 400 on invalid answer |
| Step 3 | Company knowledge as one `companyResearch` TEXT field | Per-application rows in `screening_answers`; dropped `V18` column and endpoint | One text field cannot hold multiple custom questions; needed same row model as General |
| Step 2 (01) | A "My answers" page | Replaced by cheat-sheet hub (topic 02) | Backend resource unchanged; only surface moved |
| Step 1 (02) | Inline autosave everywhere | Read-only sections, Save modal | Real usage showed inline editing mid-call worse than explicit save |
| Step 1 (02) | Cheat sheet: per-card icon + details-header button | One hub tab with picker + default-open in details | Scattered entry points confusing; one hub is fast path during call |
| Step 1 (01) | Tests switch user mid-test | Switch once before request | Thread-local `SecurityContextHolder` switch after `mockMvc.perform` has no effect |
