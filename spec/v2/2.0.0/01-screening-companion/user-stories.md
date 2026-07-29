# 2.0.0 — User Stories

## 1. "My answers" — the global template

**US-1.1** — As a candidate, I want a page with a template of the standard
screening questions, each with its own text field, so I know what to expect and
can prepare my answers once.

**US-1.2** — As a candidate, I want to add my own questions beyond the template,
so I can cover things specific to me.

**US-1.3** — As a candidate, I want my answers to save automatically as I type,
so I never lose them.

**Acceptance criteria**
- The page shows a fixed template of four standard questions, each with a
  plain-text field: tell me about yourself, why are you changing jobs, describe a
  project you worked on, expected salary.
- "What do you know about this company" is **not** in the global template. It is
  a per-application field (`Application.companyResearch`) edited in the cheat
  sheet, because the answer is different for every company.
- The fixed questions cannot be removed. The candidate can add and remove their
  own custom questions (label plus answer).
- Each answer field is plain text, up to 1000 characters.
- Edits autosave. There is no save button, and reopening the page shows the saved
  content.
- The set is global: one per user, shared across all applications.

**Edge cases**
- Nothing filled in yet, anywhere "My answers" is shown: a placeholder and a
  "Fill in your answers" button linking to this page.
- Answer longer than 1000 characters: the input is capped and a character counter
  is shown.
- Custom question saved with an empty label: not persisted.
- Autosave request fails: show an "unsaved" indicator and retry. Nothing is lost
  silently.

## 2. The cheat sheet, per application

**US-2.1** — As a candidate, when a recruiter calls about a specific application,
I want one quick screen that gathers what I need, so the call stops being an
ambush.

**US-2.2** — As a candidate, I want each application to carry its own "what do
you know about this company" note, edited right in the cheat sheet, so I keep the
global answers plus the one company-specific thing per application.

**Acceptance criteria**
- A "Cheat sheet" button is visible in the application details header.
- Clicking it opens a modal. It must be fast to open and close during a call, so
  it closes on the close button, on an outside click, and on Esc.
- The modal composes three things:
  1. the proposed salary for **this** application, stored since v1,
  2. a per-application "What do you know about this company" field
     (`Application.companyResearch`, TEXT, up to 1000 characters), editable
     inline with autosave, the same way "My answers" works,
  3. the global "My answers", read-only, with a link to edit them.
- The cheat sheet is available for applications in any status, including finished
  ones.

**Edge cases**
- The application has no proposed salary, which happens for older ones: show "-".
- "My answers" is empty: placeholder and a "Fill in your answers" link, as in
  US-1.
- `companyResearch` is empty: its field shows a placeholder. Nothing is required.
- `companyResearch` autosave is per application. Editing it on one application
  never affects another.

## 3. Board cleanup

**US-3.1** — As a candidate, I want the board to point out applications stuck too
long with no response, so the Kanban reflects reality.

**US-3.2** — As a candidate, I want to archive a dead application in one click,
so cleanup is effortless.

**Acceptance criteria**
- An application is stale when it has been in status `SENT` for more than 60
  days, counted from when it entered `SENT`. That is creation time, because
  applications are created as `SENT`.
- On board load, a banner appears at the top when there is at least one stale
  application, stating how many.
- Each stale card offers a one-click archive action. It sets status to `REJECTED`
  and the rejection reason to `NO_RESPONSE`, both of which exist since v1, and
  the card moves to the `FINISHED` column.
- Archiving is per card. There is no bulk action.

**Edge cases**
- No stale applications: no banner.
- After archiving, the count is recomputed from what is left. It is recomputed on
  every board load, and there is no persistent dismissal.
- An application that has moved out of `SENT` is never stale, regardless of age.
- Exactly 60 days is not stale. Strictly more than 60 days is.
