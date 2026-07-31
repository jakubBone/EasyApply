# 2.1.0 — As-Built

Source of truth is the code. What exists now:
[`architecture.md`](../../architecture.md) · decisions: [`adr/`](../../adr/).

## 1. What shipped

The user clicks **Generate brief** in an application's "About the company"
section. The backend saves a `company_briefs` row with status `PENDING`, returns
`202` immediately, and publishes an event. A `@TransactionalEventListener` picks
that event up **after the transaction commits**, so the background thread always
finds the row, and runs the generation on Boot's own task executor. The frontend
polls every 2 seconds until the status is `READY` or `FAILED`.

The provider is **Groq**, model `groq/compound-mini`, which runs web search on
the server side. It sits behind the `BriefChatModel` port, so tests run against a
fake and never touch the network. A Gemini adapter is still in the tree but
dormant; `brief.provider` in `application.properties` chooses between them.

One call returns all four fields in both languages. They are stored as one row
per field per language in `company_brief_fields`, so adding a locale never needs
a migration. A field the model could not fill is stored as `NULL` and rendered as
an explicit "not enough public info" marker, never as a guess.

A brief is cached per **(user, company)**. A second application to the same
company reuses it with no AI call. Editing a field writes the user's text to
every language row and sets `edited = true`, so the correction shows on every
application to that company. That flag also decides the GDPR export: edited text
is the user's own data and is exported, generated text is derived public data and
is not. Deleting an application leaves the brief; deleting the account removes
it by cascade.

Only the **company name** is sent to the provider. Nothing else — no job-ad link,
no notes, no salary, no user data.

A blank `GROQ_API_KEY` fails only the generation call. The application still
starts and the tracker works normally. Production runs on its own key, separate
from the development one, so the two never share a quota.

## 2. Changed from plan

| Where | Planned | Built | Why |
|-------|---------|-------|-----|
| §1.2–1.3 | `CompanyBrief` aggregate with `@OneToMany` fields collection | Child-side `CompanyBriefField` + own repository (two repos) | Matches existing `Note`/`NoteRepository` pattern |
| File map | `FakeBriefChatModel` in `src/main` | `src/test` with `@Profile("test")` | Test fakes stay out of production jar |
| §1.5–1.7 | `trigger` calls `worker.generate(...)` inline with `@Async` | Event-based trigger on Boot executor | Avoids race where worker starts before `PENDING` row commits; see implementation notes |
| §1.8–1.9 | `BriefFieldDto`, path `{id}` | `BriefFieldResponse`, path `{applicationId}` | Matches `ApplicationScreeningAnswerController` |
| §1.10 | Edited fields in export | `UserExportResponse.briefFields` shaped per (company, field) | One entry per locale pair, user text is same across languages |
| Step 2a | Spring AI BOM "1.1.x" | Pinned 1.1.8 | Latest stable 1.1.x at build time |
| Step 2a | Chat bean fails startup without key | 69 controller tests failed on auth | Spring AI dependencies changed security test behavior; fixed with `TestSecurityContextHolder` |
| Step 2a | Verify `.env` independence by renaming it | Verified by inspection | Test properties override all placeholders |
| Step 2b | Gemini free tier | Groq `compound-mini` | Gemini grounding disappeared; switched per [ADR-001](../../adr/ADR-001-brief-provider-strategy.md) |
| Step 2b | Spring AI auto-config | Custom `GroqClientConfig`, unused starters disabled | Blank key must fail generation only, not app startup |
| Step 2b | — | Cache setting pinned in config | Spring AI 1.1.8 requires it for Gemini adapter |
| Step 3 | DTO sketch with no null case | Maps 404 → `null` to show "Generate brief" | DTO lacked unprepared state |
| Step 3 | One `CollapsibleSection` component | `BriefSection` splits into `GenerateBriefButton` + `BriefFields` | Section used in two places: cheat sheet + application details |
| Step 3 | Modal saves all fields | Saves only changed fields with `edited=true` | Distinguishes user edits (exported) from AI output (not exported) |
| Step 3 | Field shows `texts[currentLang]` | Falls back to any non-empty locale | One-language output still renders |
| Step 3 | — | `pool: 'threads'` in `vite.config.ts` | Test file 18 exposed vitest CJS interop race |
| Step 3, verification | Marker shows for any empty text | Only untouched fields show it | Was conflating "no data" with "user cleared answer" |
| Step 3, verification | — | Unanswered screening Q hidden when brief `READY` | Display rule; data stays in export and save payload |
| Step 4 | Prompt includes company name + job-ad link | Company name only | Link had no effect on output; widened injection surface — [ADR-006](../../adr/ADR-006-drop-job-ad-link-from-brief-prompt.md) |
| Step 4 | Write E2E happy path | Fix harness first: `cy.login()` mock missing `privacyPolicyAcceptedAt` | `ConsentGate` blocked every test's `beforeEach` |
| Step 4 | Park per-offer generation in `spec/post/` | Parked in [ADR-006](../../adr/ADR-006-drop-job-ad-link-from-brief-prompt.md) §3 | `spec/post/` is gitignored, no published references |
| Docs | Blank `GROQ_API_KEY` prevents startup | Corrected | False after `GroqClientConfig` existed; verified live |

## 3. Not done

| Item | Why not |
|------|---------|
| Regenerating a ready brief, whole or per field | Contradicts US-2.1 and ADR-001 §5. The quota argument weakened with the move to Groq, but `markReady` deletes and rewrites every field, so a naive regeneration would destroy user edits. It needs its own ADR settling the edit-collision policy first |
| Removing "What do you know about us?" outright | US-3.1 keeps it, and it holds user-written text from v1 that must stay reachable. The hidden-when-empty rule already covers the actual complaint |
| "RPD verified in AI Studio" (Step 2b) | Moot. The Gemini adapter is dormant, so Groq's limits are the operative ones |
