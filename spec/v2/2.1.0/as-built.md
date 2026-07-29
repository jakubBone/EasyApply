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
| §1.2-1.3 | A `CompanyBrief` aggregate with a `@OneToMany` fields collection and one repository | Child-side `CompanyBriefField` with its own repository, so two repositories | Matches the `Note`/`NoteRepository` pattern used everywhere else in the codebase — [ADR-002](../../adr/ADR-002-brief-fields-child-side-repository.md) |
| File map | `FakeBriefChatModel` in `src/main` | `src/test`, with `@Profile("test")` | Test doubles stay out of the production jar |
| §1.5-1.7 | `trigger` calls `worker.generate(...)` inline, with `@Async("briefExecutor")` and an `AsyncConfig` | Publishes `BriefGenerationRequested`, consumed by `@TransactionalEventListener(AFTER_COMMIT)` on Boot's `applicationTaskExecutor`; `AsyncConfig` deleted | The worker's own transaction could start before the `PENDING` row was committed. Shipped as planned first, then reworked — [ADR-003](../../adr/ADR-003-in-process-async-brief-generation.md), [ADR-004](../../adr/ADR-004-transactional-event-brief-generation.md) |
| §1.8-1.9 | `BriefFieldDto`, path `{id}` | `BriefFieldResponse`, path `{applicationId}` | Matches `ApplicationScreeningAnswerController` |
| §1.10 | Edited brief fields in the export | `UserExportResponse.briefFields`, shaped `{company, fieldKey, text}` | One entry per company and field, because every locale carries the same user text |
| Step 2a | Spring AI BOM "1.1.x" | Pinned to 1.1.8 | The latest 1.1.x patch at build time |
| Step 2a | Predicted break: the chat client bean fails startup without a key | Actual break: `reactor-core` activated spring-security-test's `ReactorContextTestExecutionListener`, which nulled `@AuthenticationPrincipal` in 69 controller tests | Fixed on the test side. Nine test classes now use `TestSecurityContextHolder`, and no production code changed |
| Step 2a | Verify `.env` independence by renaming `.env` | Verified by inspection | `application-test.properties` overrides every placeholder that has no default |
| Step 2b | Gemini on the free tier | The adapter shipped, then the provider switched to Groq `groq/compound-mini` | Free-tier grounding no longer exists for new Gemini users: 429 on 3.x, 404 on 2.5. The fallback named in ADR-001 fired — [ADR-005](../../adr/ADR-005-groq-compound-brief-provider.md) |
| Step 2b | Spring AI's auto-configured client | Own `GeminiClientConfig`, later `GroqClientConfig`, plus five unused OpenAI model auto-configurations pinned to `none` | The OpenAI starter ships six auto-configurations, each asserting a non-blank key at startup. A blank key must fail generation, not the app. The auto-configuration also carries no hard per-request timeout |
| Step 2b | — | `spring.ai.google.genai.chat.enable-cached-content=false` pinned | Spring AI 1.1.8 builds the Gemini client while parsing configuration, so `@Value` injects the literal placeholder as the API key |
| Step 3 | The DTO sketch had no "not generated" case | `get` throws `EntityNotFoundException`, and `fetchBrief` maps 404 to `null` | `null` is what makes the section show the generate button |
| Step 3 | One component in `CollapsibleSection`'s action slot | `BriefSection` exports `GenerateBriefButton` and `BriefFields` separately | The section renders in two places: the cheat-sheet page and application details |
| Step 3 | The edit modal saves the brief fields | It saves only fields changed since the modal opened | `edited=true` is what puts a field in the GDPR export. Submitting all four would claim generated text as the user's own |
| Step 3 | A field shows `texts[currentLang]` | It falls back to any non-empty locale first | A provider returning one language still renders. Empty in every locale is the insufficient marker |
| Step 3 | — | `pool: 'threads'` in `vite.config.ts` | The 18th test file exposed a race in vitest's `forks` CJS interop, hitting roughly one run in five |
| Step 3, verification | The insufficient-info marker shows for any empty text | Only an untouched field shows it | It conflated "the model found nothing" (`edited=false`) with "the user cleared their own answer" (`edited=true`). A cleared field falls back to `cheatSheet.empty` |
| Step 3, verification | — | An unanswered "What do you know about us?" is hidden once a brief is `READY` | A display rule only. The answer stays in `screening_answers`, in the GDPR export and in the save payload, and a filled answer is never hidden |
| Step 4 | The prompt sends the company name and the job-ad link | The company name only; the port is `generate(String companyName)` | The link anchored nothing while widening both data egress and injection surface — [ADR-006](../../adr/ADR-006-drop-job-ad-link-from-brief-prompt.md) |
| Step 4 | Write the E2E happy path | The harness had to be fixed first: `cy.login()`'s mock user carried no `privacyPolicyAcceptedAt` | `ConsentGate` held the whole dashboard, so every spec timed out in `beforeEach` waiting on a request the app never made |
| Step 4 | Park per-offer generation in `spec/post/` | Parked in [ADR-006](../../adr/ADR-006-drop-job-ad-link-from-brief-prompt.md) §3 | `spec/post/` is gitignored, so a note there cannot be cited from a published document |
| Docs | `docker-compose.yml`, `.env.example` and the README stated that a blank `GROQ_API_KEY` prevents startup | Corrected | True when written, false once `GroqClientConfig` existed. Verified on dev: with the key blank the app starts and the tracker works; with it restored a real brief generates |

## 3. Not done

| Item | Why not |
|------|---------|
| Regenerating a ready brief, whole or per field | Contradicts US-2.1 and ADR-001 §5. The quota argument weakened with the move to Groq, but `markReady` deletes and rewrites every field, so a naive regeneration would destroy user edits. It needs its own ADR settling the edit-collision policy first |
| Removing "What do you know about us?" outright | US-3.1 keeps it, and it holds user-written text from v1 that must stay reachable. The hidden-when-empty rule already covers the actual complaint |
| "RPD verified in AI Studio" (Step 2b) | Moot. The Gemini adapter is dormant, so Groq's limits are the operative ones |
