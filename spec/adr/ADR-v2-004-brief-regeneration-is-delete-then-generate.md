# ADR-v2-004 — Regenerating a brief is delete-then-generate

## Context

`spec/v2/2.1.0/as-built.md` §3 left one item open: a `READY` brief could not be
regenerated, whole or per field. Two reasons were recorded. The quota argument —
every regeneration spends an API call — weakened when the provider moved to Groq.
The blocking one did not: `markReady` deletes every field row and rewrites it, so
a regeneration run on top of an existing brief would destroy any text the user
had corrected by hand. That text is the user's own data; it feeds the GDPR
export. Silently overwriting it on a button press is not acceptable, and merging
model output into hand-edited fields is a policy nobody had settled.

2.2.0 also collapses the brief to a single `pitch` field (see the topic's
implementation plan), which sharpens the question: with one field, "regenerate
per field" and "regenerate the whole brief" are the same action.

## Decision

**There is no regenerate endpoint. Regeneration is the user deleting the brief
and generating again.**

1. `DELETE /api/applications/{applicationId}/brief` removes the whole aggregate
   (fields cascade). It is ownership-scoped, idempotent (a missing brief is still
   `204`), and allowed in every status — a `PENDING` brief can be deleted
   mid-generation, and the worker's later `markReady` is a no-op when the row is
   gone.
2. The delete control lives **in the editor**, next to the pitch, as the same ✕
   every other prep row carries — not in the section header. Regeneration is a
   deliberate act taken while looking at the text, not a one-click header button.
3. The confirm dialog names the blast radius: the brief is shared by every
   application to that company. When the pitch was hand-edited, the message says
   so explicitly — that is the edit-collision policy, surfaced to the user rather
   than resolved by a merge rule.
4. After a delete the section falls back to its "Generate" action. Generating
   again produces a fresh `PENDING` brief with no memory of the deleted one.

This closes the open item in `spec/v2/2.1.0/as-built.md` §3. That file is not
edited; this ADR is the record.

## Alternatives rejected

- **A `POST .../brief/regenerate` endpoint that overwrites in place.** Needs a
  rule for what happens to `edited = true` fields — keep them (then it is not a
  full regeneration), or replace them (then it silently drops user data). Delete
  makes the loss explicit and consented.
- **Regenerate only the non-edited fields.** Moot after the collapse to one
  field, and even with four it is a partial-state merge that the display layer
  would have to explain.
- **Header button instead of an editor control.** A ready brief regenerating from
  a single click next to "Add/Edit" is too easy to hit by accident for an action
  that spends an API call and discards a shared, possibly hand-corrected brief.

## Consequences

- No new endpoint or status. The regeneration story is two existing calls,
  `DELETE` then `POST`, driven from the editor.
- The delete is covered by backend tests (idempotent, every status, late-worker
  no-op) and by `cypress/e2e/company-brief.cy.ts` (delete from the editor, then
  generate again).
- US-2.1's "no regeneration" acceptance criterion is superseded here; the user
  story is not edited after the fact.
- A future per-offer brief, if it is ever built, is unaffected: it is a
  different object with its own key and lifetime (ADR-v2-003 §3).
