# 2.0.0 — Cheat-Sheet Consolidation

## 1. Problem

Topic 01 shipped a working Screening Companion: a global "My answers" page, a
per-application cheat-sheet modal, and board cleanup. Using it for real before
the release — actually preparing for a call with it — surfaced two problems.

**The UX was scattered.** The global answers lived on their own tab, the
per-application note in a modal opened from the details header, and board cleanup
on the cards themselves. That is three surfaces for one job: get ready for this
call. Reaching the cheat sheet under time pressure took too many steps, and it
was not obvious which part was global and which was per application.

**The per-application company note was too thin.** `Application.companyResearch`
is a single text field. It works for one free-form note, but "About the company"
needs the same shape as "My answers": a fixed question **plus the user's own
custom questions**. A single TEXT column cannot represent that.

## 2. Solution

**One cheat-sheet hub.** The user picks an application and reads its prep in two
collapsible, colour-coded sections: "About the company" and "General". Everything
is read-only, and editing moves into an explicit Save modal instead of inline
autosave. The same content becomes the default-open section in application
details, which replaces the separate modal and tab entry points.

**Per-application question rows.** The single `companyResearch` field is replaced
by rows in the existing `screening_answers` table, using a new nullable
`application_id`. "About the company" then supports custom questions exactly like
"General" does.

## 3. Out of scope

- **No new dependency, module split, or infrastructure**, same as topic 01.
- **No data migration.** v2 is not released yet, so the old `companyResearch`
  column is dropped rather than migrated into rows.

## 4. Done when

- The cheat-sheet hub is the single preparation surface: pick an application,
  read both sections, edit through a modal.
- "About the company" carries a fixed question plus the user's own custom
  questions, per application, consistent with "General".
- Application details show the same content as a default-open accordion section,
  with no separate modal or tab.
