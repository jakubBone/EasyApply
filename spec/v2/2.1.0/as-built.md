# 2.1.0 — As-Built

> Differences between plan and what shipped, with why. Source of truth: the code.
> Deviations from [`03-company-brief/implementation-plan.md`](03-company-brief/implementation-plan.md)
> land here as steps ship; plan files are never edited after the fact.

## Step 1 — Backend

- **Brief content persistence — child-side entity + own repository, not a JPA aggregate.**
  Plan §1.2–1.3 specified `CompanyBrief` as an aggregate root with a `@OneToMany` fields
  collection and a **single** repository. Built instead as the codebase's uniform child-side
  pattern (like `Note`/`NoteRepository`): `CompanyBriefField` holds `@ManyToOne CompanyBrief`,
  `CompanyBrief` has no collection, and a dedicated `CompanyBriefFieldRepository` reads/writes
  by brief id — **two repositories**. Rationale and rejected alternatives in
  [`../../adr/ADR-002-brief-fields-child-side-repository.md`](../../adr/ADR-002-brief-fields-child-side-repository.md).
- **Table names** aligned to the plan: `company_briefs` + `company_brief_fields`
  (migration `V21`), constraints `uq_company_brief` / `uq_brief_field`.
- **`FakeBriefChatModel` lives in `src/test`** (`@Profile("test")`), mirroring `TestSecurityConfig`,
  rather than `src/main` as the plan's file map listed — test doubles stay out of the production jar.
- **Generation is scheduled after commit, not called inline.** Plan §1.5 (trigger, step 3) called
  `worker.generate(...)` directly. Built so `BriefService.trigger` registers an `afterCommit`
  synchronization (`TransactionSynchronizationManager`) that fires generation only once the `PENDING`
  row is committed. The `@Async` worker runs on another thread in its own transaction, so an inline
  call could start before the commit and not find the row. `BriefGenerationWorker` reaches its own
  `@Transactional markReady`/`markFailed` through a self proxy for the same reason `@Async` needs a
  separate bean. The in-process `@Async` execution model — and why no broker/poller/events — is
  [`../../adr/ADR-003-in-process-async-brief-generation.md`](../../adr/ADR-003-in-process-async-brief-generation.md).
- **Naming/routing touch-ups vs the plan sketch:** the field DTO is `BriefFieldResponse` (plan §1.9
  wrote `BriefFieldDto`); the controller path is `/api/applications/{applicationId}/brief` (plan §1.8
  wrote `{id}`), matching `ApplicationScreeningAnswerController`.
- **GDPR export shape.** Edited brief fields ship as `UserExportResponse.briefFields`
  (`BriefFieldExport{company, fieldKey, text}`), one entry per `(company, field)` since every locale
  carries the same user text; generated (`edited=false`) fields are excluded. Account deletion needs
  no export code — the `V21` FK cascade (`users → company_briefs → company_brief_fields`) covers it.
- **Post-step refactor (2026-07-14): the `@Async` machinery was replaced by a transactional event.**
  Step 1 first shipped as planned (§1.6–1.7: `@Async("briefExecutor")` worker, `AsyncConfig`, a manual
  `afterCommit` synchronization, a self-proxy for the transactional writes), then was reworked:
  `BriefService.trigger` now publishes `BriefGenerationRequested`, `BriefGenerationWorker` consumes it
  via `@TransactionalEventListener(AFTER_COMMIT)` and hands the model call to Boot's
  `applicationTaskExecutor`, and `markReady`/`markFailed` live on `BriefService` as plain
  `@Transactional` methods. `AsyncConfig` is deleted; the app no longer uses `@EnableAsync`/`@Async`.
  Behavior is unchanged — `BriefControllerTest` passed untouched; `BriefServiceTest` was adapted (it
  white-box-tested the old wiring) and gained `markReady`/`markFailed` unit tests. Rationale and
  alternatives:
  [`../../adr/ADR-004-transactional-event-brief-generation.md`](../../adr/ADR-004-transactional-event-brief-generation.md).

## Step 2a — Spring AI dependency

- **BOM pinned to 1.1.8** — the latest 1.1.x patch at build time (plan said "1.1.x"); the
  starter's own version is BOM-managed.
- **Classpath side effect: reactor-core re-broke `@AuthenticationPrincipal` in controller tests
  (69 failures, every secured endpoint 500).** The plan's predicted failure mode (chat client
  bean failing context startup without a key) was covered by `spring.ai.model.chat=none`; the
  actual breakage came elsewhere. `spring-ai-model` brings `reactor-core`, whose presence
  activates spring-security-test's `ReactorContextTestExecutionListener` (a no-op until then).
  That listener runs before `@BeforeEach` and touches `TestSecurityContextHolder`, which caches
  the then-empty context instance — so the tests' manual `SecurityContextHolder.setContext(...)`
  became invisible to MockMvc's `testSecurityContext()` post-processor and the principal arrived
  as `null`. Fixed test-side only: the nine controller test classes now set/clear the principal
  via `TestSecurityContextHolder` (the spring-security-test API that writes both holders). No
  production code changed.
- **`.env`-independence verified by inspection, not the planned rename run:**
  `application-test.properties` overrides every no-default placeholder in
  `application.properties`, and `spring.ai.model.chat=none` keeps the only new
  auto-configuration off in tests.
- **Known gap until Step 2b:** with the starter on the classpath and no key wired, a local
  `spring-boot:run` may fail at startup — the chat auto-configuration is disabled only in the
  test profile.

## Step 2b — Gemini adapter, then the provider switch to Groq

- **The adapter shipped as planned** (`GeminiBriefChatModel` behind the port: one grounded
  request for all fields × locales, defensive parse, any error → `FAILED`), plus
  `GeminiClientConfig` replacing Spring AI's auto-configured client for two things it cannot
  do: a hard 60 s per-request HTTP timeout and tolerating a blank key at startup. No
  annotation-driven AOP, per plan and ADR-004.
- **Framework bug found in manual verification: Spring AI 1.1.8 builds the Gemini client too
  early.** Its `CachedContentServiceCondition` calls `getBean(GoogleGenAiChatModel.class)`
  *during configuration parsing* — before Spring registers placeholder resolution — so
  `@Value` handed the client the literal string `${spring.ai.google.genai.api-key:}` (34
  chars) as the API key, and Google answered `400 API key not valid`. Boot-log tell:
  `Cannot enhance @Configuration bean definition 'geminiClientConfig' ... created too early`.
  Diagnosed via the config's key-length/prefix log line (the key itself never reaches logs).
  Fix: `spring.ai.google.genai.chat.enable-cached-content=false` pinned in
  `application.properties` — the property condition short-circuits first, so the buggy
  condition never runs. The pin must survive Spring AI upgrades until fixed upstream.
- **Product finding: free-tier grounding no longer exists for new Gemini users.** With the
  key fixed, every grounded call returned `429` — grounded requests draw from a separate
  quota pool that is empty on the free tier for all Gemini 3.x models (grounding billing
  started 2026-01-05), and the only free-grounding models (2.5-flash / 2.5-flash-lite,
  500 RPD) return `404 no longer available to new users`. ADR-001's cost-0 + grounded
  constraints became unsatisfiable on Gemini; its designated fallback fired.
- **Provider switched to Groq `groq/compound-mini`** (server-side web search, OpenAI-compatible
  API via the Spring AI OpenAI starter). Both adapters stay behind the `BriefChatModel` port,
  selected by `brief.provider` (+ `spring.ai.model.chat` — exactly one chat auto-configuration
  active); the Gemini adapter is dormant, kept as the documented return path. Rationale and
  rejected alternatives: [`../../adr/ADR-005-groq-compound-brief-provider.md`](../../adr/ADR-005-groq-compound-brief-provider.md).
- **Verified end-to-end on dev with the Groq key**: real brief generated (PENDING → READY),
  `./mvnw test` green offline (test profile pins `spring.ai.model.chat=none`; both adapters
  are `@Profile("!test")`, so tests still run on the fake). Cost 0.
- **Plan checklist item "RPD verified in AI Studio" is moot for Gemini** (provider dormant);
  the operative limits are Groq's — visible in the Groq console per key.

## Step 3 — Frontend

- **"No brief yet" is a 404, not an empty body.** `BriefService.get` throws
  `EntityNotFoundException` when the company has no brief, so `fetchBrief` maps 404 → `null`
  and every other non-OK status still throws. `null` is what makes the section show the
  generate button; the plan's DTO sketch did not cover the not-generated case.
- **The section renders in two places, so the ✨ button was built as its own export.**
  `BriefSection.tsx` exports `GenerateBriefButton` (header action) and `BriefFields` (the
  states + rows) rather than one component: the cheat-sheet page puts the button in
  `CollapsibleSection`'s `action` slot, while the application-details page has the company prep
  as a *sub-block* whose head carries the Add/Edit link. Both read the same React Query cache,
  so they stay in step. The plan (§Step 3) described only the `CollapsibleSection` slot.
- **Only *changed* brief fields are sent on save.** The edit modal snapshots the brief's texts
  when it opens and diffs against that snapshot, so saving after touching one field flags only
  that field `edited=true`. Submitting all four would mark untouched generated text as the
  user's own — and `edited=true` is exactly what puts a field in the GDPR export (§1.10).
- **Brief fields sit between the salary row and "What do you know about us?"**, inside
  `CompanyPrepReadonly`, so both pages get them from one place. The rows reuse `.prep-qa` with
  a violet left border to separate generated content from the user's own answers.
- **Language fallback beyond the plan:** a field shows `texts[currentLang]`, but falls back to
  any other non-empty locale before declaring "not enough public info", so a provider that
  returns only one language still renders. Empty-in-every-locale is the insufficient marker.
- **Test-suite fix: `pool: 'threads'` in `vite.config.ts`.** Adding an 18th test file made the
  suite fail intermittently (~1 run in 5) with `does not provide an export named 'parse'`
  (cookie) / `'getConfig'` (@testing-library/dom) — a different file each time, always passing
  in isolation and serially. Vitest's default `forks` pool resolves externalized CJS deps
  natively per process, and that interop raced; threads share one process's resolution.
  Verified with 12 consecutive full-suite runs. Unrelated to the brief itself — the extra file
  only crossed the threshold that exposed it.
- **Verified in-session:** `npm run test:run` 130 tests / 18 files green, `npm run lint` and
  `npm run build` clean. `BriefSection.test.tsx` covers the plan's list (button on a brief-less
  application, generating state, four fields, language switch, insufficient marker, retry from
  `FAILED`, no regenerate control when `READY`) plus the changed-fields-only save.
  `CheatSheet.test.tsx` gained a `useBrief` mock — the company section now reads that hook and
  the spec renders without a `QueryClientProvider`.
- **Not done in this step:** the Cypress E2E happy path is Step 4, as planned.

### Fixed after the first manual verification pass

- **A cleared field no longer claims "not enough public info".** The marker was shown for any
  empty text, conflating "the model found nothing" (`edited=false`) with "the user deleted
  their own answer" (`edited=true`). Only an untouched field can make that claim; a cleared one
  falls back to `cheatSheet.empty` (`-`), the same empty state every other prep row uses.
- **An unanswered "What do you know about us?" is hidden once a brief is `READY`** — in the
  read-only rows and, decided at open, in the edit modal. With four brief rows above it, an
  empty fixed question is only noise. It is a **display rule, not a data change**: the answer
  stays in `screening_answers` and in the GDPR export, the row stays in the save payload, and
  a filled answer is never hidden — hiding the user's own text would put it out of reach.
  Clearing an answer therefore hides its row (next open, for the modal) and writing one brings
  it back. The modal freezes the decision at open so the field cannot vanish mid-typing.
  US-3.1 places the brief "next to" this question; that still holds whenever it has content.

### Raised in verification, deliberately not done

- **Regenerating a ready brief (whole or per-field)** — contradicts US-2.1 and ADR-001 §5
  ("a ready brief is final"). The quota argument behind that rule weakened with the move to
  Groq, so it is revisitable, but naive regeneration also destroys user edits: `markReady`
  deletes and rewrites every field, and edited fields are personal data in the export. Needs
  its own ADR settling the edit-collision policy first.
- **Removing "What do you know about us?" outright** — US-3.1 keeps it, and the field holds
  user-written text from v1 that must stay reachable. The empty-row rule above covers the
  actual complaint without touching data.
- **Dropping the job-ad link from the prompt** — US-1.1 mandates sending it, but it anchors
  nothing (the company name is the prompt's subject, so a link to a different company changes
  no output) while widening data egress and the injection surface ADR-001 §4 describes.
  Proposed for Step 4 as ADR-006, together with parking per-offer generation in `spec/post/`.

## Step 4 — Release chores

- **`GroqClientConfig` — the blank-key hazard had six sources, not one.** The finding carried
  into Step 4 described a single missing piece: the Groq path ran on Spring AI's auto-configured
  OpenAI client, which asserts a non-blank key while building the bean, so a missing or rotated
  key took the whole application down. Built the counterpart of `GeminiClientConfig`: an own
  `OpenAiApi` bean (`OpenAiChatAutoConfiguration` declares `openAiApi(..)` and
  `openAiChatModel(OpenAiApi, ..)` as separate `@ConditionalOnMissingBean` beans, so supplying
  the api makes it back off from building its own — and from the assertion), the key wrapped in
  `SimpleApiKey`, whose contract is `Assert.notNull`, not `hasText`, plus a hard 10 s connect /
  60 s read timeout the auto-configured `RestClient` does not carry. `GroqBriefChatModel` still
  injects `ChatModel` and did not change.
- **That fixed only the chat path.** With a blank key, startup still died — now in
  `OpenAiAudioSpeechAutoConfiguration`. The OpenAI starter ships **six** model
  auto-configurations (chat, embedding, image, moderation, audio speech, audio transcription),
  each activating from the classpath alone and each running the same
  `OpenAIAutoConfigurationUtil.resolveConnectionProperties` assertion. The five unused ones are
  pinned to `none` in `application.properties`, which also stops five unused model beans from
  being built on every start. The Gemini side needs no equivalent — its embedding connection
  auto-configuration asserts `project-id`/`location` (the Vertex path), not a key.
- **Verified on dev:** with `GROQ_API_KEY` blank the application starts, logs
  `Groq client: api key MISSING (0 chars, prefix '')`, and the rest of the tracker works;
  with the key restored, generation works as before.
- **Docs corrected in step:** `docker-compose.yml`, `applikon-backend/.env.example` and the
  README variable table all stated that a blank `GROQ_API_KEY` prevents startup — true when
  written, false as of this change.
- **The job-ad link left the prompt
  ([ADR-006](../../adr/ADR-006-drop-job-ad-link-from-brief-prompt.md)).** The port is now
  `generate(String companyName)`; both adapters dropped the link hint, and
  `BriefGenerationRequested` dropped the field. Data egress for the feature is one value: the
  company name the user typed. `Application.link` is untouched everywhere else — the user still
  opens it and the GDPR export still carries it; only the AI path stopped reading it. The
  adapter tests now assert the prompt contains no URL, so the reduction is enforced by the suite.
- **The E2E suite was dead before the brief spec was written — every spec, at the consent
  gate.** `cy.login()`'s mock user carried no `privacyPolicyAcceptedAt`, so `ConsentGate` held
  the whole dashboard behind the consent modal, no view ever loaded, and each spec timed out in
  `beforeEach` on a request the app never made. One field in `cypress/support/e2e.ts` fixed it.
  Diagnosed from Cypress's failure screenshot after the existing `cheat-sheet.cy.ts` failed
  identically to the new spec — the control run is what separated "my spec is wrong" from "the
  harness is wrong".
- **Per-offer generation was parked in the ADR, not in `spec/post/` as the plan's checklist
  said.** `spec/post/` is gitignored (`.gitignore:46`, no files tracked), so a note there is
  invisible to any reader of the repo and cannot be cited from a published document. ADR-006 §3
  carries the reasoning instead — different cache key, different lifetime, its own egress
  justification — where it stays readable next to the decision that produced it.
