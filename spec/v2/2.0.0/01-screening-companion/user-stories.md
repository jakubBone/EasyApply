# Applikon v2 — User Stories

> Stories, edge cases, and acceptance criteria for v2 (Screening Companion).
> Source of features: [`brief.md`](brief.md). Decisions taken with the user
> are recorded inline as acceptance criteria.

---

## 1. "My answers" — global screening template (brief §3.1a)

**US-1.1** — As a candidate, I want a page with a template of the standard
screening questions, each with its own text field, so I know what to expect and
can prepare my answers once.

**US-1.2** — As a candidate, I want to add my own questions beyond the template,
so I can cover things specific to me.

**US-1.3** — As a candidate, I want my answers to save automatically as I type, so
I never lose them.

**Acceptance criteria**
- The page shows a **fixed template** of standard *global* screening questions, each
  with a plain-text field: tell me about yourself · why are you changing jobs ·
  briefly describe a project you worked on · expected salary.
- *"What do you know about this company" is **not** in the global template — it is a
  **per-application** field (`Application.companyResearch`) edited in the cheat sheet
  (see US-2.2), because the answer differs for every company.*
- The fixed questions cannot be removed; the candidate **can add and remove their
  own** custom questions (label + answer).
- Each answer field is **plain text** (no formatting), up to **1000 characters**.
- Edits **autosave** (no save button); reopening the page shows the saved content.
- "My answers" is **global** — one set per user, shared across all applications.

**Edge cases**
- **Empty state** (nothing filled yet), wherever "My answers" is surfaced → show a
  placeholder + a **"Fill in your answers"** button linking to this page.
- Answer exceeds 1000 chars → input is capped; a character counter is shown.
- Custom question saved with an empty label → not persisted.
- Autosave request fails → show an "unsaved" indicator and retry; no silent loss.

---

## 2. Cheat sheet — per-application view (brief §3.1b)

**US-2.1** — As a candidate, when a recruiter calls about a specific application, I
want one quick screen that gathers what I need, so the call stops being an ambush.

**US-2.2** — As a candidate, I want each application to carry its own "what do you
know about this company" note, edited right in the cheat sheet, so I keep the global
answers plus the one company-specific thing per application.

**Acceptance criteria**
- A **"Cheat sheet"** button is visible in the **application details header**.
- Clicking it opens a **modal** (fast to open and close during a call — closes on
  the close button, outside click, and Esc).
- The modal composes:
  1. the **proposed salary for THIS application** (stored since v1),
  2. a **per-application "What do you know about this company"** field
     (`Application.companyResearch`, TEXT, ≤1000 chars), **editable inline** in the
     modal with **autosave** (same UX as "My answers"),
  3. the **global "My answers"** (read view) with an **edit link**.
- The cheat sheet is available for applications in **any status**, including
  finished (offer/rejected).

**Edge cases**
- Application has **no proposed salary** recorded (older applications) → show **"-"**.
- "My answers" is empty → placeholder + **"Fill in your answers"** link (same as
  US-1, edge case).
- `companyResearch` empty → its field shows a placeholder; nothing is required.
- `companyResearch` autosave is **per application** — editing it on one application
  never affects another.

---

## 3. Board cleanup — dead cards (brief §3.2)

**US-3.1** — As a candidate, I want the board to point out applications stuck too
long with no response, so the Kanban reflects reality.

**US-3.2** — As a candidate, I want to archive a dead application in one click, so
cleanup is effortless.

**Acceptance criteria**
- An application is **stale** when it has been in status **`SENT` for more than 60
  days**, counted from when it entered `SENT` (= creation, since applications are
  created as `SENT`).
- On board load, a **banner at the top** appears when there is at least one stale
  application, stating how many.
- Each stale card offers a **one-click archive** action. Clicking it sets
  **status = `REJECTED`, rejection reason = `NO_RESPONSE`** (enums exist since v1);
  the card moves to the **`FINISHED`** column.
- Archiving is **per card** — no bulk action.

**Edge cases**
- No stale applications → no banner.
- After archiving, the stale count / banner is **recomputed** (reflects what's
  left); recomputed on each board load (no persistent dismissal in v2).
- An application that has moved out of `SENT` (e.g. to `IN_PROGRESS`) is **not**
  counted as stale, regardless of age.
- Boundary: exactly 60 days is **not** stale; strictly **> 60 days** is.
