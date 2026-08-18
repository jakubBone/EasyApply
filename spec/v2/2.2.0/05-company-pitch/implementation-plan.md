# 2.2.0 05-company-pitch — Implementation Plan

## Design in one page

This topic mostly removes code. Four generated fields become one, three fixed
questions become three deletable defaults spread over two scopes, and one fixed
question is retired outright.

| Problem | Approach | What it means here |
|---|---|---|
| Four fields nobody asks for | One `pitch` field, driven by the prompt | `BriefLocales.FIELD_KEYS` shrinks to one entry and everything downstream follows, because the whole path is already data-driven by that list |
| Old rows still hold the four keys | An explicit `V22` migration | Hand-edited text is folded into `pitch`; everything else is deleted in the open, not left to fall out of some later save |
| A wrong or stale brief cannot be replaced | `DELETE /api/applications/{id}/brief` | Refreshing is delete-then-generate, which is why regeneration never collides with an edit (ADR-v2-004) |
| Built-in questions cannot be removed | The template seeds an empty set, it does not merge into every set | `buildItems` takes the template as an argument and applies it only when the server returns nothing |
| Answers are lost by a misclick | A confirmation on non-empty rows | The same `confirm(tErrors(...))` pattern as `CVManager` and `NotesList` |

**The template stops being a merge.** Today `buildItems` maps over
`FIXED_QUESTION_KEYS` and always produces those rows, which is exactly why a
built-in question cannot be deleted: it comes back on the next open, and
replace-all then writes it again. After this change the template is a seed for an
empty set only. The cost is stated in US-2.1 and accepted: deleting every question
in a scope and saving brings the defaults back, because an empty set and a never
filled one are the same thing on the wire.

**No new persistence concepts.** No soft delete, no `deleted_at`, no undo. The
existing replace-all upsert for screening answers already expresses deletion, and
brief deletion is a plain row delete cascading to its fields.

## What changes

**Backend, changed**
```
service/ai/BriefLocales.java          FIELD_KEYS -> ["pitch"]
service/ai/GroqBriefChatModel.java    new prompt, FIELD_HINTS collapses to one
service/ai/GeminiBriefChatModel.java  the same, kept in step with the dormant twin
service/ai/FakeBriefChatModel.java    one field per locale
service/BriefService.java             + delete(userId, applicationId)
controller/BriefController.java       + DELETE, 204
db/migration/V22__company_pitch.sql   new
```

**Frontend, changed**
```
types/domain.ts                       BRIEF_FIELD_KEYS -> BRIEF_PITCH_KEY
hooks/useBrief.ts                     + useDeleteBrief
services/api.ts                       + deleteBrief
components/prep/globalAnswers.ts      template as a seed, shared labelFor
components/prep/GlobalAnswersModal.tsx    remove on every row, confirm when answered
components/prep/CompanyQuestionsModal.tsx same, plus the pitch editor and delete
components/prep/BriefSection.tsx      one pitch block, clamped, with delete
components/prep/PrepReadonly.tsx      the showCompanyAnswer rule goes away
components/prep/prep.css              .brief-pitch
i18n/locales/{pl,en}/common.json      brief.pitch*, delete confirmations; drop the four field labels and answers.questions.project
```

## Step 1 — Backend: one field and a prompt worth the call

`BriefLocales.FIELD_KEYS` becomes `List.of("pitch")`. `LOCALES` is untouched.
Every consumer — the prompt builder, `parse`, `markReady`, `buildResponse`,
`editFields` — already iterates that list, so the change propagates without new
branching.

The prompt is the point of the release. It stops asking for a company profile and
asks for what the candidate will say:

- the model still searches the web and still receives **only the company name**,
  exactly as ADR-v2-003 requires;
- it returns a few sentences that a candidate could say aloud when asked what they
  know about the company and why they applied;
- it must name something concrete — a product, a market, a technology, a recent
  move. Text that would fit any employer is a failure of the prompt, not an
  acceptable answer;
- when there is not enough public information it sets the field to `null` for
  every language rather than guessing, unchanged from 2.1.0.

`FIELD_HINTS` collapses from four entries to the one that describes the pitch.
`GeminiBriefChatModel` gets the same prompt so the dormant adapter does not rot.
`FakeBriefChatModel` returns one entry per locale.

**Tests** — `BriefServiceTest` and `BriefControllerTest` assert one field per
locale instead of four; the insufficient marker still survives into the response;
the edit path still writes one user text to every locale with `edited=true`.

**Done when** generating produces a single `pitch` field in PL and EN and
`./mvnw test` is green.

**Checklist**
- [ ] `BriefLocales.FIELD_KEYS` is `["pitch"]`
- [ ] The Groq prompt targets "what do you know about us, and why us?" and still sends only the company name
- [ ] `GeminiBriefChatModel` and `FakeBriefChatModel` follow
- [ ] Backend tests updated and `./mvnw test` green

## Step 2 — `V22`: retire the old data in the open

Two unrelated cleanups, both explicit, both in one migration because they land in
the same release.

```sql
-- 1. Fold hand-edited text into the single `pitch` field, oldest first so the
--    most recent edit wins the row.
INSERT INTO company_brief_fields (brief_id, field_key, lang, text, edited)
SELECT DISTINCT ON (brief_id, lang) brief_id, 'pitch', lang, text, TRUE
FROM   company_brief_fields
WHERE  edited = TRUE AND field_key <> 'pitch'
ORDER  BY brief_id, lang, id DESC;

-- 2. Everything else is derived public data. It goes.
DELETE FROM company_brief_fields WHERE field_key <> 'pitch';

-- 3. A brief left with no fields held only generated text. Drop it so the
--    section falls back to the generate button instead of showing an empty brief.
DELETE FROM company_briefs b
WHERE NOT EXISTS (SELECT 1 FROM company_brief_fields f WHERE f.brief_id = b.id);

-- 4. The retired question and every answer written under it.
DELETE FROM screening_answers WHERE custom = FALSE AND question_key = 'project';
```

No unique-constraint collision is possible: `UNIQUE (brief_id, field_key, lang)`
is untouched by the insert because no `pitch` row exists yet. Nothing is
generating during a migration, so no background job is orphaned.

`V21`'s column comment lists the four old keys. Shipped migrations are not
edited, so `V22` carries a header comment saying it supersedes that comment.

Point 4 is deliberate. The alternative — letting `buildItems` stop producing the
row and letting replace-all drop it on the next save — deletes the same data
later, silently, and only for users who happen to open the editor. Doing it here
makes it one event with a date and a reason in the history.

**Done when** the migration runs clean on a copy of production data and the
tables hold only `pitch` rows.

**Checklist**
- [ ] `V22__company_pitch.sql` with the four statements and the note superseding `V21`'s comment
- [ ] Verified against a restored production dump: edited text survives as `pitch`, nothing else remains
- [ ] `./mvnw test` green with the migration applied

## Step 3 — `DELETE /api/applications/{id}/brief`

`BriefService.delete(userId, applicationId)`: resolve the owned application, read
its company, `findByUserIdAndCompanyName`, delete the aggregate. Fields go with it
through `orphanRemoval` and the foreign key. Deleting a brief that does not exist
is a no-op, not a 404 — the outcome the caller asked for is already true.

Deletion is allowed in every status, `PENDING` included. A generation still in
flight then writes to a brief that is gone; `markReady` already loads by id and
must simply do nothing when the row has vanished, rather than throw. Answers and
screening rows are untouched by this endpoint.

`BriefController` gains `@DeleteMapping`, returning 204, ownership-scoped through
`user.id()` like every other method.

**Tests** — delete removes the brief and its fields; generating afterwards
produces a fresh `PENDING`; deleting from one application removes it for every
application to that company; deleting a `PENDING` brief leaves nothing behind and
the late worker write is a no-op; a foreign application is 404 and deletes
nothing; deleted edited text disappears from the export.

**Done when** delete-then-generate works end to end.

**Checklist**
- [ ] `BriefService.delete`, ownership-scoped, idempotent
- [ ] `markReady` tolerates a brief deleted mid-generation
- [ ] `DELETE /api/applications/{id}/brief` returning 204
- [ ] Tests above green

## Step 4 — Frontend: the pitch

- `types/domain.ts`: `BRIEF_FIELD_KEYS` becomes `export const BRIEF_PITCH_KEY = 'pitch'`.
  `BriefField`, `BriefResponse` and `BriefFieldEdit` keep their shapes — the wire
  format is unchanged, there is simply one field on it.
- `services/api.ts` gets `deleteBrief(id)`; `hooks/useBrief.ts` gets
  `useDeleteBrief`, invalidating `['brief']` like the other mutations.
- `BriefSection.tsx`: `BriefFields` renders one block instead of mapping over four
  keys. It is **not** a `prep-qa` row — it carries no question header, so nothing
  stacks two identical titles on top of each other (US-4.1). New `.brief-pitch`
  style: prose, visually distinct from the answer cards, `-webkit-line-clamp: 3`
  with an expand toggle. `PENDING` and `FAILED` states are unchanged.
- The delete control sits in the section header next to the generate button, and
  renders only while a brief exists — the mirror image of `GenerateBriefButton`,
  which renders only while one does not. Clicking it confirms first. The
  confirmation says the brief is shared by every application to this company, and
  a second variant says the user's own text goes with it when `edited` is set.
- `PrepReadonly.tsx`: `showCompanyAnswer` and its comment are deleted. The fixed
  company question now renders like any other row, empty as `-`, because the user
  can remove it if they do not want it.
- `CompanyQuestionsModal.tsx`: the `BRIEF_FIELD_KEYS` loop becomes one textarea
  for the pitch, `MAX_BRIEF` unchanged; `buildBriefTexts` and `changedBriefFields`
  work over the single key.
- i18n: `brief.fields.*` (four keys) is replaced by the pitch label and the
  expand/collapse control; delete confirmations land in the errors namespace next
  to `cv.deleteConfirm`.

**Tests** (vitest) — a `READY` brief renders one pitch block with no question
header; long text is clamped and expands on demand; the delete control appears
only with a brief and the generate button only without one; cancelling the
confirmation deletes nothing; confirming removes the brief and the generate button
returns; an unanswered company question is visible now that a ready brief no
longer hides it.

**Done when** the "About the company" block is salary, pitch, one question and
whatever the user added.

**Checklist**
- [ ] `BRIEF_PITCH_KEY`, `deleteBrief`, `useDeleteBrief`
- [ ] One headerless pitch block, `.brief-pitch`, clamped to three lines with expand
- [ ] Delete control with confirmation, including the edited-text variant
- [ ] `showCompanyAnswer` removed from `PrepReadonly`
- [ ] Pitch editing in `CompanyQuestionsModal`
- [ ] i18n PL and EN updated, the four field labels removed
- [ ] vitest, lint and build green

## Step 5 — Frontend: every question deletable

- `globalAnswers.ts`: `FIXED_QUESTION_KEYS` becomes `['about-me', 'why-changing']`.
  `FIXED_COMPANY_KEY` **stays** — it is now the whole per-application template.
  `answers.questions.project` is removed from both locale files, since Step 2
  deleted every row that used it.
- `buildItems(server, template)` returns the server set as-is when it is
  non-empty, and seeds from `template` only when it is empty. Both modals call it,
  so `CompanyQuestionsModal`'s private `Item`, `buildItems` and `toRequest`
  disappear and it imports the shared ones. `Item` keeps `questionKey`, so
  `toRequest` no longer has to force `FIXED_COMPANY_KEY` onto non-custom rows —
  it carries its own key.
- A shared `labelFor(item, t)`: the custom label for custom rows, the i18n
  question label otherwise. One rule for both modals and both read views.
- The remove button loses its `item.custom` guard in both modals — every row has
  one. `removeCustom` becomes `removeItem` and, when the row's current answer is
  non-empty, asks `confirm(tErrors('answers.deleteConfirm'))` first. It reads the
  editor state, not the server state, so unsaved text is protected too.
- `showFixedQuestion` in `CompanyQuestionsModal` and the `!item.custom && !showFixedQuestion`
  render guard are deleted, together with the render-freeze comment. Nothing is
  hidden any more.
- `PrepReadonly.tsx`: both read views walk the answers they were given and label
  them through `labelFor`, instead of walking a fixed key list and looking the
  answers up.

**Tests** (vitest) — every row has a remove button in both modals; removing an
answered row prompts and cancelling keeps it; removing an empty row does not
prompt; a removed built-in question is gone from the read view after saving;
removing everything and saving leaves the section empty, and reopening the editor
re-seeds the defaults.

**Done when** no question in either scope is permanent.

**Checklist**
- [ ] `FIXED_QUESTION_KEYS` is `['about-me', 'why-changing']`; `answers.questions.project` removed
- [ ] `buildItems(server, template)` seeds only an empty set; both modals share it
- [ ] Shared `labelFor`; `CompanyQuestionsModal`'s private copies deleted
- [ ] Remove button on every row, confirming when the answer is non-empty
- [ ] `showFixedQuestion` and its render guard deleted
- [ ] vitest, lint and build green

## Step 6 — Release chores

- Cypress: extend `company-brief.cy.ts` with delete-then-generate, and
  `cheat-sheet.cy.ts` with removing a built-in question, both through `data-cy`.
- ADR-v2-004: regeneration is delete-then-generate. One page. It closes the open
  item in `spec/v2/2.1.0/as-built.md` §3 by making the edit-collision question
  moot — a delete is something the user does deliberately.
- `spec/architecture.md`: the single `pitch` field, the `DELETE` endpoint, and the
  question template as a seed rather than a merge.
- `as-built.md` for 2.2.0: deviations only.
- CHANGELOG entry and the version bumps in `package.json`, `pom.xml` and the
  README badge.
- Deploy per `spec/deployment/deployment-hetzner.md`. `V22` is destructive, so the
  database backup before deploying is not optional.

**Done when** 2.2.0 is live and the docs match what shipped.

**Checklist**
- [ ] E2E for brief deletion and question removal
- [ ] ADR-v2-004, and the 2.1.0 open item closed
- [ ] `spec/architecture.md` and `as-built.md` updated
- [ ] CHANGELOG `2.2.0` and version bumps
- [ ] Backup taken, deployed, verified live
