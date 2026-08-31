# 2.2.0 — As-Built

Source of truth is the code. What exists now:
[`architecture.md`](../../architecture.md) · decisions: [`adr/`](../../adr/).

One topic: [`05-company-pitch/`](05-company-pitch/).

## 1. What shipped

The company brief collapses from four researched fields to one, `pitch` — the
classic "what do you know about the company" interview answer. `BriefLocales.
FIELD_KEYS` is `["pitch"]`; every code path that iterated the four keys now
iterates one, so persistence, the prompt, `markReady` and the edit path needed no
structural change. Both provider prompts and their field hints were rewritten to
the company-knowledge shape, still web-grounded on the company name alone
(ADR-v2-003).

`DELETE /api/applications/{id}/brief` removes the brief (fields cascade). It is
ownership-scoped, idempotent, and allowed in every status; `markReady` tolerates
a brief deleted mid-generation. Regeneration is delete-then-generate, driven from
the editor — [ADR-v2-004](../../adr/ADR-v2-004-brief-regeneration-is-delete-then-generate.md),
which closes the open item in [`2.1.0/as-built.md`](../2.1.0/as-built.md) §3.

`V23__company_pitch.sql` folds any hand-edited field text into `pitch` (newest
edit wins), discards generated text, drops briefs left empty, retires the
"Tell us about your project" screening question, and merges the built-in
"What do you know about us?" answer (`company-knowledge`) into `pitch` before
retiring that question too.

Frontend: `BriefFields` renders one labeled `.brief-pitch` block, clamped to
three lines with an expand toggle. The delete control is an ✕ in the editor next
to the pitch, with a confirm that names the shared-brief blast radius and a
harder message when the pitch was hand-edited; deleting closes the editor and the
section falls back to "Generate".

Every screening question is now removable, built-in ones included.
`buildItems(server, template)` returns the saved set verbatim once anything is
stored and only seeds `template` into a never-saved section, so a deleted
built-in question does not come back. Both answer modals and both read views
share `Item` / `buildItems` / `toRequest` / `labelFor` from `globalAnswers.ts`.
Removing a row with a non-empty answer asks first. "About the company" has no
built-in question of its own — the pitch is that answer.

## 2. Changed from plan

| Where | Planned | Built | Why |
|-------|---------|-------|-----|
| Step 4, i18n | Remove `cheatSheet.companyLabel` | Removed `companyLabel` **and** `companyPlaceholder`; added `brief.delete` | The placeholder was dead once the built-in row went; `brief.delete` is the ✕ control's aria-label |
| Step 4, pitch clamp | `-webkit-line-clamp: 3` with an expand toggle | Toggle renders whenever there is pitch text, not only when it overflows three lines | Measuring real overflow needs a ref + resize observer for a control that is harmless when the text is short |
| Step 5, `labelFor` | Shared by both modals | Shared by the module; `CompanyQuestionsModal` does not call it | Every row there is a custom question with an editable label input; only `GlobalAnswersModal` and the read views render a fixed label |
| Step 6, deploy note | "`V22` is destructive — back up first" | The destructive migration is **`V23`** | Plan typo; `V22` is the unrelated agency/salary_source column drop |
| Step 6, deploy | `V23` applies on the first deploy | Failed on the first deploy and rolled back; fixed in a follow-up commit and redeployed | Step 5's second statement referenced the `newest_answer` CTE after it had gone out of scope (a `WITH` clause covers only the one statement it heads). Folded step 5 into a single `INSERT` whose `ensured_brief` CTE upserts with `DO UPDATE ... RETURNING`, so the field insert reads the pitch off that output |

## 3. Not done

| Item | Why not |
|------|---------|
| Migrations executed against PostgreSQL in the suite | The test profile sets `spring.flyway.enabled=false` and runs on H2, so `./mvnw test` never applies a migration. `V23` reaching production broken is the direct cost — its SQL had only ever been parsed, never run. A Testcontainers pass that applies every migration to real PostgreSQL is the fix; out of scope for this topic |
