# 2.2.0 05-company-pitch — Implementation Plan

## What changes

**Backend**
```
service/ai/BriefLocales.java          FIELD_KEYS -> ["pitch"]
service/ai/GroqBriefChatModel.java    new prompt, one FIELD_HINTS entry
service/ai/GeminiBriefChatModel.java  the same (dormant twin)
service/ai/FakeBriefChatModel.java    one field per locale
service/BriefService.java             + delete(userId, applicationId)
controller/BriefController.java       + DELETE, 204
db/migration/V22__company_pitch.sql   new
```

**Frontend**
```
types/domain.ts                           BRIEF_FIELD_KEYS -> BRIEF_PITCH_KEY
services/api.ts / hooks/useBrief.ts       + deleteBrief, useDeleteBrief
components/prep/globalAnswers.ts          template as a seed, shared labelFor
components/prep/GlobalAnswersModal.tsx    remove on every row + confirm
components/prep/CompanyQuestionsModal.tsx same, + pitch editor
components/prep/BriefSection.tsx          one pitch block + delete control
components/prep/PrepReadonly.tsx          drop showCompanyAnswer
components/prep/prep.css                  .brief-pitch
i18n/locales/{pl,en}/common.json          brief.pitch*, confirmations; drop brief.fields.* and answers.questions.project
```

## Step 1 — Backend: one field

`BriefLocales.FIELD_KEYS` becomes `List.of("pitch")`; `LOCALES` unchanged. The
prompt builder, `parse`, `markReady`, `buildResponse` and `editFields` all iterate
that list, so no other branching changes.

New prompt rules:
- still web-grounded, still receives **only the company name** (ADR-v2-003);
- returns a few sentences the candidate can say when asked what they know about
  the company and why they applied;
- must name something concrete (product, market, technology, recent move);
- not enough public information → `null` for every language, as in 2.1.0.

**Tests** — one field per locale instead of four; insufficient marker still
survives into the response; `editFields` still writes one text to every locale
with `edited=true`.

**Checklist**
- [ ] `BriefLocales.FIELD_KEYS` is `["pitch"]`
- [ ] Groq prompt rewritten; only the company name leaves the system
- [ ] Gemini and Fake adapters follow
- [ ] `./mvnw test` green

## Step 2 — `V22__company_pitch.sql`

```sql
-- Supersedes V21's field_key column comment (industry|product_customers|tech_stack|size_stage).

-- 1. Fold hand-edited text into `pitch`, newest edit wins.
INSERT INTO company_brief_fields (brief_id, field_key, lang, text, edited)
SELECT DISTINCT ON (brief_id, lang) brief_id, 'pitch', lang, text, TRUE
FROM   company_brief_fields
WHERE  edited = TRUE AND field_key <> 'pitch'
ORDER  BY brief_id, lang, id DESC;

-- 2. Generated text is derived public data.
DELETE FROM company_brief_fields WHERE field_key <> 'pitch';

-- 3. A brief with no fields left held only generated text — drop it so the
--    section falls back to the generate button.
DELETE FROM company_briefs b
WHERE NOT EXISTS (SELECT 1 FROM company_brief_fields f WHERE f.brief_id = b.id);

-- 4. The retired question and every answer under it.
DELETE FROM screening_answers WHERE custom = FALSE AND question_key = 'project';
```

No collision on `UNIQUE (brief_id, field_key, lang)`: no `pitch` row exists yet.

**Checklist**
- [ ] `V22__company_pitch.sql` with the four statements
- [ ] Verified on a restored production dump: edited text survives as `pitch`, nothing else remains
- [ ] `./mvnw test` green with the migration applied

## Step 3 — `DELETE /api/applications/{id}/brief`

`BriefService.delete(userId, applicationId)`: owned application → company →
`findByUserIdAndCompanyName` → delete the aggregate (fields cascade). Missing
brief is a no-op, not a 404. Allowed in every status, so `markReady` must do
nothing when the brief is gone instead of throwing. Screening answers untouched.

`BriefController`: `@DeleteMapping`, 204, scoped through `user.id()`.

**Tests** — delete removes brief and fields; generating afterwards gives a fresh
`PENDING`; delete applies to every application to that company; deleting a
`PENDING` brief leaves nothing and the late worker write is a no-op; foreign
application → 404, nothing deleted; deleted edited text leaves the export.

**Checklist**
- [ ] `BriefService.delete`, ownership-scoped, idempotent
- [ ] `markReady` tolerates a brief deleted mid-generation
- [ ] `DELETE /api/applications/{id}/brief` → 204
- [ ] Tests green

## Step 4 — Frontend: the pitch

- `types/domain.ts`: `BRIEF_FIELD_KEYS` → `BRIEF_PITCH_KEY = 'pitch'`. Wire types
  unchanged.
- `deleteBrief(id)` in `api.ts`, `useDeleteBrief` invalidating `['brief']`.
- `BriefFields` renders one block, not a `prep-qa` row: no question header,
  `.brief-pitch` prose style, `-webkit-line-clamp: 3` with an expand toggle.
  `PENDING` / `FAILED` unchanged.
- Delete control in the section header, rendered only while a brief exists (mirror
  of `GenerateBriefButton`). Confirms first; the text says the brief is shared by
  every application to this company, with a second variant when `edited` is set.
- `PrepReadonly`: delete `showCompanyAnswer`; the company question renders like any
  other row, empty as `-`.
- `CompanyQuestionsModal`: the `BRIEF_FIELD_KEYS` loop becomes one textarea,
  `MAX_BRIEF` unchanged; `buildBriefTexts` and `changedBriefFields` use the single key.
- i18n: `brief.fields.*` → pitch label + expand control; delete confirmations in
  the errors namespace next to `cv.deleteConfirm`.

**Tests** — `READY` renders one headerless pitch block; long text clamps and
expands; delete control only with a brief, generate button only without; cancelled
confirmation deletes nothing; after confirming, the generate button returns; an
unanswered company question is visible with a ready brief.

**Checklist**
- [ ] `BRIEF_PITCH_KEY`, `deleteBrief`, `useDeleteBrief`
- [ ] Headerless `.brief-pitch` block, clamped to three lines with expand
- [ ] Delete control + confirmation, including the edited-text variant
- [ ] `showCompanyAnswer` removed
- [ ] Pitch editing in `CompanyQuestionsModal`
- [ ] i18n PL and EN; the four field labels removed
- [ ] vitest, lint, build green

## Step 5 — Frontend: every question deletable

- `FIXED_QUESTION_KEYS` → `['about-me', 'why-changing']`. `FIXED_COMPANY_KEY`
  stays as the per-application template. `answers.questions.project` removed from
  both locale files.
- `buildItems(server, template)`: returns the server set as-is when non-empty,
  seeds from `template` only when empty. This is what makes a built-in question
  deletable — today the merge always re-creates it.
- Both modals use the shared `Item` / `buildItems` / `toRequest`;
  `CompanyQuestionsModal`'s private copies are deleted. `Item` keeps
  `questionKey`, so `toRequest` no longer forces `FIXED_COMPANY_KEY`.
- Shared `labelFor(item, t)`: custom label for custom rows, i18n label otherwise.
- Remove button on every row (drop the `item.custom` guard in both modals).
  `removeCustom` → `removeItem`, confirming via `confirm(tErrors('answers.deleteConfirm'))`
  when the row's current editor answer is non-empty.
- Delete `showFixedQuestion` and the `!item.custom && !showFixedQuestion` guard.
- `PrepReadonly`: both read views walk the answers they were given and label via
  `labelFor`, instead of walking a fixed key list.

**Tests** — remove button on every row in both modals; answered row prompts and
cancelling keeps it; empty row does not prompt; a removed built-in question is
gone from the read view after saving; removing everything leaves the section
empty and reopening the editor re-seeds the defaults.

**Checklist**
- [ ] `FIXED_QUESTION_KEYS` is `['about-me', 'why-changing']`; `answers.questions.project` removed
- [ ] `buildItems(server, template)` seeds only an empty set; shared by both modals
- [ ] Shared `labelFor`; private copies deleted
- [ ] Remove button on every row, confirming on a non-empty answer
- [ ] `showFixedQuestion` and its render guard deleted
- [ ] vitest, lint, build green

## Step 6 — Release chores

- Cypress: `company-brief.cy.ts` — delete then generate; `cheat-sheet.cy.ts` —
  removing a built-in question. Both through `data-cy`.
- ADR-v2-004: regeneration is delete-then-generate; closes the open item in
  `spec/v2/2.1.0/as-built.md` §3.
- `spec/architecture.md`: single `pitch` field, `DELETE` endpoint, template as a
  seed rather than a merge.
- `as-built.md` for 2.2.0 — deviations only.
- CHANGELOG `2.2.0` and version bumps in `package.json`, `pom.xml`, README badge.
- Deploy per `spec/deployment/deployment-hetzner.md`. `V22` is destructive —
  back up the database first.

**Checklist**
- [ ] E2E for brief deletion and question removal
- [ ] ADR-v2-004; 2.1.0 open item closed
- [ ] `spec/architecture.md` and `as-built.md` updated
- [ ] CHANGELOG `2.2.0` and version bumps
- [ ] Backup taken, deployed, verified live
