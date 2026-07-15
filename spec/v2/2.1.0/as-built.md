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
