# v2 Phase 5-6 — Cheat-sheet consolidation

> **Status:** Built (2026-07-02).
> Follows [`../01-screening-companion/plan.md`](../01-screening-companion/plan.md) Phases 1-4 (Screening Companion, shipped
> 2026-06-30). Not a new version — v2 was not yet released, so this phase still
> ships inside v2.

---

## 1. What triggered this phase

Phases 1-4 shipped a working Screening Companion: a global "My answers" page, a
per-application cheat-sheet modal composing salary + one company note + the global
answers, and board cleanup. Dogfooding it before the first v2 release — actually
using it to prep for a call — surfaced two separate problems:

**a) The UX was scattered.** The global answers lived on their own tab, the
per-application note in a details-header modal, board cleanup on the cards
themselves — three different surfaces for one job ("get ready for this call"), with
inline autosave everywhere. Reaching the cheat sheet under time pressure (the
recruiter-just-called scenario this whole version exists for) took too many steps,
and it wasn't obvious what was global vs per-application.

**b) The per-application company note was too thin.** `Application.companyResearch`
(Phase 3) is a single text field. It works for one free-form note, but "About the
company" needed the same shape as "My answers" — a fixed question **plus the user's
own custom questions** — which a single TEXT column can't represent.

## 2. What this phase does

- **Consolidates the prep UX into one cheat-sheet hub**: pick an application, read
  its prep in two collapsible, colour-coded sections ("About the company" /
  "General"), everything read-only with editing moved to an explicit Save modal
  (replacing inline autosave). The same content becomes the default-open section in
  application details, replacing the separate modal/tab entry points.
- **Replaces the single `companyResearch` field with per-application rows** in the
  existing `screening_answers` table (new nullable `application_id`), so "About the
  company" supports custom questions exactly like "General" does.

Full phase breakdown, backend/frontend build steps, and DoD: see
[`plan.md`](plan.md).

