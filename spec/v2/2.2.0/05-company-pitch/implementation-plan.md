# 2.2.0 05-company-pitch — Implementation Plan

## What changes

**Backend**
```
service/ai/BriefLocales.java          FIELD_KEYS -> ["pitch"]
service/ai/GroqBriefChatModel.java    new prompt, one FIELD_HINTS entry
service/ai/GeminiBriefChatModel.java  the same (dormant twin)
service/ai/FakeBriefChatModel.java    one field per locale, insufficientNext toggle
service/BriefService.java             + delete(userId, applicationId)
controller/BriefController.java       + DELETE, 204
db/migration/V23__company_pitch.sql   new
```

**Frontend**
```
types/domain.ts                           BRIEF_FIELD_KEYS -> BRIEF_PITCH_KEY
services/api.ts / hooks/useBrief.ts       + deleteBrief, useDeleteBrief
components/prep/globalAnswers.ts          shared Item / buildItems(server, template) / labelFor;
                                           no FIXED_COMPANY_KEY — the pitch is that field
components/prep/GlobalAnswersModal.tsx    remove on every row + confirm, via shared helpers
components/prep/CompanyQuestionsModal.tsx same, + labeled pitch editor with its own ✕ delete
components/prep/BriefSection.tsx          one labeled pitch block, no header delete control
components/prep/PrepReadonly.tsx          drop the built-in company question entirely
components/prep/prep.css                  .brief-pitch, .brief-pitch-label
i18n/locales/{pl,en}/common.json          brief.pitchLabel, brief.expand/collapse;
                                           drop brief.fields.*, cheatSheet.companyLabel,
                                           answers.questions.project
i18n/locales/{pl,en}/errors.json          brief.deleteConfirm(Edited), answers.deleteConfirm
```

## Step 1 — Backend: one field

`BriefLocales.FIELD_KEYS` becomes `List.of("pitch")`; `LOCALES` unchanged. The
prompt builder, `parse`, `markReady`, `buildResponse` and `editFields` all iterate
that list, so no other branching changes.

New prompt rules — the classic "what do you know about our company" interview
answer, not a research dossier and not a statement of the candidate's own
motivation:
- still web-grounded, still receives **only the company name** (ADR-v2-003);
- returns what the candidate would say when asked what they know about the
  company: what it does, its product or service, its market, what sets it apart;
- must name something concrete (product, market, technology, recent move) —
  generic filler that would fit any employer is a failed generation;
- explicitly does **not** cover "why I applied here" — that is a different,
  personal question, out of scope for this field;
- not enough public information → `null` for every language, as in 2.1.0.

**Tests** — one field per locale instead of four; insufficient marker still
survives into the response; `editFields` still writes one text to every locale
with `edited=true`.

**Checklist**
- [x] `BriefLocales.FIELD_KEYS` is `["pitch"]`
- [x] Groq prompt rewritten to the company-knowledge structure, no "why applied"; only the company name leaves the system
- [x] Gemini and Fake adapters follow
- [x] `./mvnw test` green

## Step 2 — `V23__company_pitch.sql`

```sql
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

-- 4. The retired "Tell us about your project" question and every answer under it.
DELETE FROM screening_answers WHERE custom = FALSE AND question_key = 'project';

-- 5. The built-in "What do you know about us?" question merges into `pitch`
--    instead of staying a separate row — the two read as duplicates of each
--    other. Newest per-application answer per (user, company) wins, mirroring
--    step 1: ensure a company_briefs row exists, upsert the answer as `pitch`
--    in every locale with edited=true, mark the brief READY, then drop the
--    question. See the file itself for the exact statements.
```

No collision on `UNIQUE (brief_id, field_key, lang)` for step 1: no `pitch` row
exists yet when it runs. Step 5's upsert uses `ON CONFLICT ... DO UPDATE` since a
`pitch` row may already exist for that brief by then (from generation or step 1).

**Checklist**
- [x] `V23__company_pitch.sql` with all statements, including the company-knowledge fold-in
- [ ] Verified on a restored production dump: edited text and folded-in company-knowledge answers survive as `pitch`, nothing else remains
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
- [x] `BriefService.delete`, ownership-scoped, idempotent
- [x] `markReady` tolerates a brief deleted mid-generation
- [x] `DELETE /api/applications/{id}/brief` → 204
- [x] Tests green

## Step 4 — Frontend: the pitch

- `types/domain.ts`: `BRIEF_FIELD_KEYS` → `BRIEF_PITCH_KEY = 'pitch'`. Wire types
  unchanged.
- `deleteBrief(id)` in `api.ts`, `useDeleteBrief` invalidating `['brief']`.
- `BriefFields` renders one labeled block: a small `.brief-pitch-label` ("✨ What
  do you know about the company") above the text, `.brief-pitch` prose style,
  `-webkit-line-clamp: 3` with an expand toggle. `PENDING` / `FAILED` unchanged.
  No delete control here — deleting lives in the editor, not the section header.
- `CompanyQuestionsModal`: the pitch textarea carries the same label plus its own
  ✕ remove button (the same `prep-remove-btn` pattern every other row uses).
  Clicking it confirms (the brief is shared by every application to this
  company; a distinct message when the pitch was edited), then deletes and
  closes the whole editor — the read view falls back to the "Generate" action.
  `MAX_BRIEF` unchanged; `buildBriefText`/`changedBriefFields` use the single
  `pitch` key.
- `PrepReadonly`'s `CompanyPrepReadonly`: renders salary, `BriefFields`, then only
  custom questions — no built-in company row, because the pitch already is that
  row.
- i18n: `brief.fields.*` → `brief.pitchLabel` + expand/collapse; `cheatSheet.companyLabel`
  removed (nothing reads it once the built-in row is gone); delete confirmations
  in the `errors` namespace next to `cv.deleteConfirm`.

**Tests** — `READY` renders one labeled pitch block; long text clamps and
expands; the pitch's ✕ confirms, and cancelling deletes nothing; confirming
closes the editor and the "Generate" action returns; no built-in company row
exists anywhere in the read view or the editor.

**Checklist**
- [x] `BRIEF_PITCH_KEY`, `deleteBrief`, `useDeleteBrief`
- [x] Labeled `.brief-pitch` block, clamped to three lines with expand
- [x] Pitch delete control lives in the editor (✕ next to the field), not the section header
- [x] `cheatSheet.companyLabel` and the built-in company row removed from `PrepReadonly`
- [x] Pitch editing + delete in `CompanyQuestionsModal`
- [x] i18n PL and EN; the four field labels removed
- [x] vitest, lint, build green

## Step 5 — Frontend: every other question deletable

- `FIXED_QUESTION_KEYS` → `['about-me', 'why-changing']`. `answers.questions.project`
  removed from both locale files. No `FIXED_COMPANY_KEY` / company template —
  "About the company" has no built-in question of its own.
- `buildItems(server, template)`: returns the server set as-is when non-empty,
  seeds from `template` only when empty. This is what makes a built-in question
  deletable — a naive merge would always re-create it. `CompanyQuestionsModal`
  calls it with an empty template (custom questions only); `GlobalAnswersModal`
  calls it with `FIXED_QUESTION_KEYS`.
- Both modals use the shared `Item` / `buildItems` / `toRequest` / `labelFor`
  from `globalAnswers.ts`; no private copies.
- Remove button on every row (drop the `item.custom` guard in both modals).
  `removeItem` confirms via `confirm(tErrors('answers.deleteConfirm'))` when the
  row's current editor answer is non-empty.
- `PrepReadonly`: both read views walk `buildItems(answers, template)` and label
  via `labelFor`, the same seeding the editors use — an unsaved section still
  shows its built-in questions, and a deliberately emptied one stays empty.

**Tests** — remove button on every row in both modals; answered row prompts and
cancelling keeps it; empty row does not prompt; a removed built-in question is
gone from the read view after saving; removing everything leaves the section
empty and reopening the editor re-seeds the defaults.

**Checklist**
- [ ] `FIXED_QUESTION_KEYS` is `['about-me', 'why-changing']`; `answers.questions.project` removed
- [ ] `buildItems(server, template)` seeds only an empty set; shared by both modals
- [ ] Shared `labelFor`; no private copies
- [ ] Remove button on every row, confirming on a non-empty answer
- [ ] vitest, lint, build green

## Step 6 — Release chores

- Cypress: `company-brief.cy.ts` — generate, edit, delete-from-editor-then-generate;
  `cheat-sheet.cy.ts` — removing a built-in "General" question.
- ADR-v2-004: regeneration is delete-then-generate (from the editor); closes the
  open item in `spec/v2/2.1.0/as-built.md` §3 without editing that file.
- `spec/architecture.md`: single `pitch` field with a visible label, `DELETE`
  endpoint, no built-in company question, template as a seed rather than a merge.
- `as-built.md` for 2.2.0 — deviations only.
- CHANGELOG `2.2.0` and version bumps in `package.json`, `pom.xml`, README badge.
- Deploy per `spec/deployment/deployment-hetzner.md`. `V22` is destructive —
  back up the database first.

**Checklist**
- [ ] E2E for brief generate/edit/delete and question removal
- [ ] ADR-v2-004; 2.1.0 open item closed by the ADR alone
- [ ] `spec/architecture.md` and `as-built.md` updated
- [ ] CHANGELOG `2.2.0` and version bumps
- [ ] Backup taken, deployed, verified live
