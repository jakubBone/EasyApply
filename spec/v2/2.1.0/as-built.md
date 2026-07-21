# 2.1.0 — As-Built

> Differences between plan and what shipped, with why. Source of truth: the code.
> Topic `03-company-brief`; plan files are never edited after the fact.
> What exists now: [`../../architecture.md`](../../architecture.md) ·
> decisions: [`../../adr/`](../../adr/).

## Deviations from plan

| Where | Planned | Built | Why |
|-------|---------|-------|-----|
| §1.2–1.3 | `CompanyBrief` aggregate with a `@OneToMany` fields collection, one repository | Child-side `CompanyBriefField` + its own repository (two repos) | Matches the codebase's `Note`/`NoteRepository` pattern — [ADR-002](../../adr/ADR-002-brief-fields-child-side-repository.md) |
| File map | `FakeBriefChatModel` in `src/main` | `src/test` (`@Profile("test")`) | Test doubles stay out of the production jar |
| §1.5–1.7 | `trigger` calls `worker.generate(...)` inline; `@Async("briefExecutor")` + `AsyncConfig` | Publishes `BriefGenerationRequested`, consumed via `@TransactionalEventListener(AFTER_COMMIT)` on Boot's `applicationTaskExecutor`; `AsyncConfig` deleted | The worker's own transaction could start before the `PENDING` row committed; shipped as planned first, then reworked — [ADR-003](../../adr/ADR-003-in-process-async-brief-generation.md), [ADR-004](../../adr/ADR-004-transactional-event-brief-generation.md) |
| §1.8–1.9 | `BriefFieldDto`, path `{id}` | `BriefFieldResponse`, path `{applicationId}` | Matches `ApplicationScreeningAnswerController` |
| §1.10 | Edited brief fields in the export | `UserExportResponse.briefFields` (`{company, fieldKey, text}`) | One entry per (company, field) — every locale carries the same user text |
| Step 2a | Spring AI BOM "1.1.x" | Pinned 1.1.8 | Latest 1.1.x patch at build time |
| Step 2a | Predicted break: chat client bean fails startup without a key | Actual break: `reactor-core` activated spring-security-test's `ReactorContextTestExecutionListener`, nulling `@AuthenticationPrincipal` in 69 controller tests | Fixed test-side — nine test classes now use `TestSecurityContextHolder`; no production code changed |
| Step 2a | Verify `.env`-independence by renaming `.env` | Verified by inspection | `application-test.properties` overrides every no-default placeholder |
| Step 2b | Gemini on the free tier | Adapter shipped, then the provider switched to Groq `groq/compound-mini` | Free-tier grounding no longer exists for new Gemini users (429 on 3.x, 404 on 2.5); ADR-001's fallback fired — [ADR-005](../../adr/ADR-005-groq-compound-brief-provider.md) |
| Step 2b | Spring AI's auto-configured client | Own `GeminiClientConfig`, later `GroqClientConfig` + five unused OpenAI model auto-configurations pinned to `none` | The OpenAI starter ships six auto-configurations, each asserting a non-blank key at startup; a blank key must fail generation, not the app. Auto-configuration also carries no hard per-request timeout |
| Step 2b | — | `spring.ai.google.genai.chat.enable-cached-content=false` pinned | Spring AI 1.1.8 builds the Gemini client during configuration parsing, so `@Value` injects the literal placeholder as the API key |
| Step 2b checklist | "RPD verified in AI Studio" | Moot | The Gemini adapter is dormant; the operative limits are Groq's |
| Step 3 | DTO sketch had no not-generated case | `get` throws `EntityNotFoundException`; `fetchBrief` maps 404 → `null` | `null` is what makes the section show the generate button |
| Step 3 | One component in `CollapsibleSection`'s action slot | `BriefSection` exports `GenerateBriefButton` and `BriefFields` separately | The section renders in two places — the cheat-sheet page and application details |
| Step 3 | Edit modal saves the brief fields | Saves only fields changed since the modal opened | `edited=true` is what puts a field in the GDPR export; submitting all four would claim generated text as the user's own |
| Step 3 | Field shows `texts[currentLang]` | Falls back to any non-empty locale first | A provider returning one language still renders; empty in every locale is the insufficient marker |
| Step 3 | — | `pool: 'threads'` in `vite.config.ts` | The 18th test file exposed a race in vitest's `forks` CJS interop (~1 run in 5) |
| Step 4 | Prompt sends company name + job-ad link | Company name only; the port is `generate(String companyName)` | The link anchored nothing while widening data egress and injection surface — [ADR-006](../../adr/ADR-006-drop-job-ad-link-from-brief-prompt.md) |
| Step 4 | Write the E2E happy path | Had to fix the harness first — `cy.login()`'s mock user carried no `privacyPolicyAcceptedAt` | `ConsentGate` held the whole dashboard, so every spec timed out in `beforeEach` on a request the app never made |
| Step 4 | Park per-offer generation in `spec/post/` | Parked in [ADR-006](../../adr/ADR-006-drop-job-ad-link-from-brief-prompt.md) §3 | `spec/post/` is gitignored, so a note there cannot be cited from a published document |

## Fixed after the first manual verification pass

- **The insufficient-info marker showed for any empty text**, conflating "the model found
  nothing" (`edited=false`) with "the user cleared their own answer" (`edited=true`). Only an
  untouched field can make that claim; a cleared one falls back to `cheatSheet.empty`.
- **An unanswered "What do you know about us?" is hidden once a brief is `READY`** — a display
  rule only. The answer stays in `screening_answers`, in the GDPR export and in the save payload;
  a filled answer is never hidden.

## Notes

- `docker-compose.yml`, `applikon-backend/.env.example` and the README variable table all stated
  that a blank `GROQ_API_KEY` prevents startup — true when written, false as of `GroqClientConfig`.
- Verified on dev: with the key blank the app starts and the tracker works; with it restored a
  real brief generates. `./mvnw test` stays green offline — both adapters are `@Profile("!test")`,
  so tests run on the fake.

## Raised in verification, deliberately not done

| Item | Why not |
|------|---------|
| Regenerating a ready brief (whole or per-field) | Contradicts US-2.1 and ADR-001 §5. The quota argument weakened with the move to Groq, but `markReady` deletes and rewrites every field, so naive regeneration destroys user edits — needs its own ADR settling the edit-collision policy |
| Removing "What do you know about us?" outright | US-3.1 keeps it, and it holds user-written text from v1 that must stay reachable; the hidden-empty-row rule covers the actual complaint |
