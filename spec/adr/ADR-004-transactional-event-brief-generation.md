# ADR-004 — Brief generation via transactional event + Boot executor

> **Status:** Accepted (2026-07-14) · **Scope:** release 2.1.0 (company brief) ·
> Supersedes the **execution mechanism** of
> [ADR-003](ADR-003-in-process-async-brief-generation.md); ADR-003's no-broker /
> durability decision stands unchanged.

## Context

Step 1 shipped background generation exactly as planned (plan §1.6–1.7, ADR-003):
`@Async("briefExecutor")` on a dedicated `ThreadPoolTaskExecutor`, `@EnableAsync`
isolated in its own `AsyncConfig`, a hand-registered `afterCommit`
`TransactionSynchronization` in `BriefService.trigger`, and a self-proxy
(`ObjectProvider<BriefGenerationWorker>`) so the worker's `@Transactional` writes go
through the Spring proxy. It worked and was fully tested.

Three costs surfaced after shipping:

1. **Hand-rolled machinery where the framework has one idiom.** The manual
   synchronization and the self-proxy are low-level workarounds;
   `@TransactionalEventListener(AFTER_COMMIT)` states the same contract declaratively,
   and moving the transactional writes to another bean removes the self-invocation
   problem instead of routing around it.
2. **`@EnableAsync` was implicated twice.** Its advising bean-post-processor was the
   prime suspect in the Step-1 `@AuthenticationPrincipal`-null bug, and again when the
   first Step-2 attempt (the Spring AI dependency) had to be rolled back. Keeping the
   ingredient in the context keeps that suspicion alive for every future
   startup-order issue.
3. **Maintainability by a single maintainer.** The owner could not confidently reason
   about the self-proxy / synchronization code. In a one-person project, code the
   maintainer cannot debug is a liability regardless of green tests.

## Decision

Replace the wiring, not the behavior:

1. `BriefService.trigger` publishes `BriefGenerationRequested(briefId, company,
   jobAdLink)` inside its transaction.
2. `BriefGenerationWorker.on` is a `@TransactionalEventListener(phase = AFTER_COMMIT)`:
   Spring delivers the event only once the `PENDING` row is committed. The listener
   hands the model call to Boot's auto-configured `applicationTaskExecutor` and
   returns immediately.
3. `markReady` / `markFailed` move to `BriefService` as `@Transactional` methods; the
   worker calls them through the normal injected proxy.
4. Deleted: `AsyncConfig`, `@EnableAsync`, the `briefExecutor` pool, the self-proxy,
   the manual synchronization. The feature adds no AOP beyond `@Transactional`.

Endpoints, statuses, idempotency and retry semantics are unchanged:
`BriefControllerTest` passed untouched. `BriefServiceTest` was adapted (it
white-box-tested the old wiring) and gained `markReady`/`markFailed` unit tests.

## Alternatives considered

- **Keep the as-built Step 1 wiring** — rejected: works, but carries all three costs
  above for zero functional benefit over the idiom.
- **`@Async` + `@TransactionalEventListener` on the listener** — the textbook variant;
  rejected because it keeps `@EnableAsync` (an advising bean-post-processor) in the
  context. The explicit `taskExecutor.execute(...)` hand-off achieves the same with
  strictly less machinery.
- **Synchronous generation (no background work)** — rejected: reworks the shipped
  202+poll API contract, the user stories and the frontend plan, and holds a request
  thread for the seconds-long model call.

## Consequences

- One configuration class fewer; no `@Async` anywhere; the
  `@EnableAsync`/bean-post-processor class of startup-ordering hazards is gone **by
  construction** — relevant before re-attempting Step 2, which adds Spring AI
  auto-configurations to the context.
- The background pool is Boot-managed (`spring.task.execution.*` to tune; threads are
  named `task-*` instead of `brief-*` in logs).
- **Sharp edge:** `@TransactionalEventListener` defaults to `fallbackExecution=false` —
  an event published outside any transaction is silently dropped. `trigger` is
  `@Transactional`, so this holds today; a future non-transactional caller would
  silently not generate.
- Durability is exactly as in ADR-003: in-process, fire-and-forget, a JVM death
  mid-generation leaves a stuck `PENDING`; the DB-poller upgrade path there remains
  the designated fix.
