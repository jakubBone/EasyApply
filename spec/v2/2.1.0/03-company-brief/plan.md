# v2/2.1.0 Phase 7-10 — Implementation Plan

> Continues the era phase numbering from
> [`../../2.0.0/02-cheat-sheet-consolidation/plan.md`](../../2.0.0/02-cheat-sheet-consolidation/plan.md) (Phases 5-6).
> Why this release exists: [`brief.md`](brief.md) · decisions:
> [`user-stories.md`](user-stories.md) · provider & trust boundary:
> [`../../../adr/ADR-001-gemini-free-tier-grounding.md`](../../../adr/ADR-001-gemini-free-tier-grounding.md).

**Working rhythm — a phase is done only when:** its tests are green (frontend
verified in-session; backend `./mvnw test` on the dev machine — no JDK
in-session), its checklist below is ticked, and
[`../../as-built.md`](../../as-built.md) records what was actually built
(deviations go to as-built §2, never back into this file).

---

## Phase 7 — Backend: brief resource on a stub `ChatModel`

The whole resource, testable without any live AI: generation is called through
the Spring AI `ChatModel` abstraction, and every test runs against a stub
(ADR-001 §6 — this *is* the swappability proof).

**Build**
- `V21__company_briefs.sql` — two tables:
  - **`company_briefs`** (the per-user cache): `user_id` (FK → `users`,
    `ON DELETE CASCADE`), `company_name`, `status` (`PENDING`/`READY`/`FAILED`),
    4 fields × 2 languages as nullable TEXT (`industry_pl`, `industry_en`,
    `product_customers_*`, `tech_stack_*`, `size_stage_*`; **NULL = "not enough
    public info"**), timestamps; unique `(user_id, company_name)` (exact string —
    no fuzzy matching, per user-stories §1).
  - **`application_brief_answers`** (the user's per-application edits):
    `application_id` (FK → `applications`, `ON DELETE CASCADE`), `field_key`,
    `answer` TEXT; unique `(application_id, field_key)`. Single-language on
    purpose: an edit wins in both languages (user-stories §4).
- Display logic = **cache + overrides**: a field shows the user's override when
  one exists, otherwise the cached text in the current language. The cache is
  never modified by edits; nothing is physically copied on generation.
- `BriefService` (+ entity/repos): `generate(user, applicationId)` — ownership
  check (`existsByIdAndUserId`), **cache hit for the same company → READY
  immediately, no model call**; otherwise insert `PENDING` and run the
  `ChatModel` call `@Async`; success → `READY`, exception → `FAILED`.
  Trigger is idempotent: `READY`/`PENDING` → no-op; **retry only from `FAILED`**.
- `BriefController`:
  - `POST /api/applications/{id}/brief` — trigger (or cache reuse); returns status.
  - `GET  /api/applications/{id}/brief` — status + fields `{key, pl, en, override}`.
  - `PUT  /api/applications/{id}/brief/answers` — save the user's field edits.
- GDPR: overrides are user data → in `UserExportService` and removed with the
  application/account; the cache is **not exported** but cascades on account
  deletion (user-stories §5).
- i18n: validation/status message keys PL + EN.

**Tests (stub `ChatModel`)** — trigger → `PENDING` → `READY` with both languages
stored; NULL field survives to the response (insufficient-info marker); cache
reuse on a second application (stub called once); stub throwing → `FAILED`;
retry allowed only from `FAILED`, no-op on `READY`/`PENDING`; foreign
application rejected; override save/read (cache untouched); export contains
overrides, not the cache; account deletion removes both tables' rows.

**DoD** — full brief lifecycle works and is fully tested with **zero network /
zero API keys**; `./mvnw test` green on the dev machine.

**Checklist**
- [ ] `V21`: `company_briefs` + `application_brief_answers` (FKs, unique keys)
- [ ] `BriefService`: async generate, cache reuse, idempotent trigger, retry-from-FAILED only
- [ ] `POST`/`GET /api/applications/{id}/brief` + `PUT .../brief/answers` (ownership-scoped)
- [ ] GDPR: overrides in export + cascade; cache cascades, not exported
- [ ] Stub-`ChatModel` test suite (list above) — `./mvnw test` green (dev machine)
- [ ] as-built updated · checklist ticked

---

## Phase 8 — Backend: live Gemini with search grounding

Swap the stub for the real provider — config and prompt only, no domain change.

**Build**
- Spring AI dependency (BOM) + Gemini (2.5 Flash) `ChatModel` config; **Google
  Search grounding enabled**; sensible call timeout; any provider error →
  `FAILED` (never a partial brief).
- **Structured output**: one request returns all 4 fields × {PL, EN}, each field
  nullable = "not enough public info" — the model is instructed to mark, never
  guess (ADR-001 §3).
- Prompt: input is **company name + job-ad link when present** (link as a
  priority hint, not a hard restriction) — nothing else, ever.
- Config via env vars only: key name added to **`.env.example`** (never `.env`);
  **separate dev / prod API keys (separate Google projects)** — verify the
  actual free-tier RPD in Google AI Studio for each.
- Unit tests keep running on the stub — **no network in tests**.

**Manual verification (dev machine, dev key)** — a well-known company → 4
sensible fields in PL and EN; an obscure company → explicit insufficient-info
fields, no hallucination; provider key removed/invalid → `FAILED`, core app
unaffected.

**DoD** — a real brief generates end-to-end on dev; `./mvnw test` still green
offline; cost 0.

**Checklist**
- [ ] Spring AI + Gemini config (grounding, timeout, error → `FAILED`)
- [ ] Structured bilingual output with per-field insufficient markers
- [ ] Prompt sends company name + link only; link = priority hint
- [ ] `.env.example` updated; separate dev/prod keys; RPD verified in AI Studio
- [ ] Manual verification pass (known company / obscure company / dead key)
- [ ] as-built updated · checklist ticked

---

## Phase 9 — Frontend: generate button, states, editing

**Build**
- `api.ts` + hooks: `useBrief(applicationId)` (GET, polls while `PENDING`),
  `useGenerateBrief` (POST), `useSaveBriefAnswers` (PUT).
- **"About the company" section header** gets a **✨ "Generate brief"** button
  next to "Add/Edit" — visually distinctive as *the* AI action (accent/gradient,
  same header-action slot `CollapsibleSection` already provides). Shown on
  **every application without a brief** (incl. pre-2.1.0 ones).
- States in the section: no brief → button · `PENDING` → "generating…" +
  spinner · `FAILED` → error + **"try again"** · `READY` → the 4 brief fields
  render as Q&A-style rows **above** "What do you know about us?" (same visual
  language as existing prep cards). **No regenerate control ever appears for a
  ready brief.**
- Editing: the section's existing edit modal gains the 4 brief fields; saving
  writes overrides. Field shows override when present, else the cached text for
  the **current app language** (switching PL/EN switches instantly; edited
  fields show the same user text in both).
- "Not enough public info" fields render the explicit i18n marker, not `-`.
- i18n PL + EN for everything (field labels, button, states, marker).

**Tests (vitest)** — button renders when no brief (incl. old applications);
click → generating state; `READY` renders 4 fields in the current language and
switches with it; `FAILED` shows try-again which re-triggers; edit saves an
override and it wins in both languages; insufficient field shows the marker;
no regenerate control when `READY`.

**DoD** — full flow clickable against the backend; `npm run test:run` + `lint`
+ `build` green (verified in-session).

**Checklist**
- [ ] Hooks/api wired to the three endpoints (poll while `PENDING`)
- [ ] ✨ Generate button in the section header next to Add/Edit, on every brief-less application
- [ ] Section states: button / generating / failed+try-again / 4 Q&A rows; no regenerate when ready
- [ ] Edit modal extended; overrides win in both languages; language switch instant
- [ ] Insufficient-info marker + full i18n PL/EN
- [ ] vitest + lint + build green (in-session) · as-built updated · checklist ticked

---

## Phase 10 — Release chores (2.1.0)

**Build**
- Cypress E2E: stubbed happy path (open application → generate → fields appear
  → edit one) via `data-cy`, language-independent.
- `spec/architecture.md`: new tables, endpoints, the async AI call and its trust
  boundary (link ADR-001).
- `../../as-built.md`: final pass for Phases 7-10.
- CHANGELOG `2.1.0` (`feat` → minor) + version bump (`package.json`, `pom.xml`,
  README badge).
- Deploy per `spec/deployment/deployment-hetzner.md` (prod API key configured
  as env var on the server, never committed).

**DoD** — working deploy with the brief live on prod (dev key quota untouched);
CHANGELOG/versions consistent; `npm run e2e` green locally.

**Checklist**
- [ ] E2E stubbed happy path (`data-cy`)
- [ ] `spec/architecture.md` + `as-built.md` updated
- [ ] CHANGELOG `2.1.0` + version bumps
- [ ] Deployed; prod key separate from dev; verified live
- [ ] LinkedIn post (per release ritual)

---

## Cross-cutting Definition of Done (Phases 7-10)

- [ ] All success criteria in [`brief.md`](brief.md) §5 met; all acceptance
  criteria in [`user-stories.md`](user-stories.md) hold.
- [ ] **Nothing generates without a user click**; a ready brief never regenerates.
- [ ] Only company name + job-ad link ever leave the system; cost 0 (free tier,
  separate dev/prod quota).
- [ ] All new UI strings exist in PL **and** EN.
- [ ] Backend `./mvnw test` green (dev machine); frontend `test:run` + `lint` +
  `build` green (in-session); `npm run e2e` green locally.
- [ ] No new infrastructure beyond the Spring AI dependency (no queue, no
  scheduler, no new deployable).
