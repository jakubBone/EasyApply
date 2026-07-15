# ADR-004 — Brief generation via transactional event + Boot executor

> **Status:** Accepted (2026-07-14) · **Scope:** release 2.1.0 (company brief) ·
> Supersedes the **execution mechanism** of
> [ADR-003](ADR-003-in-process-async-brief-generation.md); ADR-003's no-broker /
> durability decision stands unchanged.

## Context

Step 1 shipped background generation exactly as planned (plan §1.6–1.7, ADR-003).
The wiring had three hand-made parts:

- `@Async("briefExecutor")` — the worker ran on its own thread pool, which required
  `@EnableAsync` and an `AsyncConfig` class;
- a hand-registered "run this after commit" callback in `BriefService.trigger`, so the
  background thread would not start before the `PENDING` row was actually committed;
- a **self-proxy**: the worker injected *itself* to reach its own `@Transactional`
  methods through the Spring proxy — a plain call on `this` bypasses the proxy and
  runs without a transaction.

It worked and was fully tested. Three costs surfaced after shipping:

1. **Hand-rolled code where Spring has one built-in idiom.** The after-commit callback
   and the self-proxy are workarounds. `@TransactionalEventListener(AFTER_COMMIT)`
   states the same contract — "run this only after the commit" — in one declarative
   annotation, and moving the transactional writes to another bean removes the
   self-call problem entirely instead of routing around it.
2. **`@EnableAsync` was a suspect in two startup bugs.** It registers a
   bean-post-processor — a component created before all normal beans, which forces its
   own dependencies to initialize too early, before the context is fully configured.
   That early initialization was the prime suspect when `@AuthenticationPrincipal`
   came back `null` in all controllers (Step 1), and again when the first Step-2
   attempt (the Spring AI dependency) had to be rolled back. As long as the ingredient
   stays in the context, every future startup-order bug starts with the same suspect.
3. **A single maintainer must be able to debug it.** The owner could not confidently
   reason about the self-proxy and callback code. In a one-person project, code the
   maintainer cannot debug is a liability even with green tests.

## Decision

Replace the wiring, keep the behavior:

1. `BriefService.trigger` publishes a `BriefGenerationRequested(briefId, company,
   jobAdLink)` event inside its transaction.
2. `BriefGenerationWorker.on` listens with `@TransactionalEventListener(phase =
   AFTER_COMMIT)`: Spring delivers the event only once the `PENDING` row is committed.
   The listener hands the slow model call to Boot's own thread pool
   (`applicationTaskExecutor`) and returns immediately.
3. `markReady` / `markFailed` move to `BriefService` as plain `@Transactional` methods.
   The worker calls them on a normally injected bean, so the proxy just works — no
   self-proxy needed.
4. Deleted: `AsyncConfig`, `@EnableAsync`, the `briefExecutor` pool, the self-proxy,
   the manual callback. The feature keeps no proxy machinery beyond `@Transactional`.

The API contract is unchanged: same endpoints, statuses, idempotency and retry rules.
`BriefControllerTest` passed untouched. `BriefServiceTest` was adapted (it tested the
old wiring directly) and gained `markReady`/`markFailed` unit tests.

## Alternatives considered

- **Keep the as-built Step 1 wiring** — works, but carries all three costs above and
  buys nothing over the built-in idiom.
- **`@Async` on the event listener** — the textbook variant; rejected because it keeps
  `@EnableAsync` in the context. Handing the call to the executor explicitly
  (`taskExecutor.execute(...)`) does the same with strictly less machinery.
- **Synchronous generation (no background work)** — rejected: it would rework the
  shipped 202+poll API contract, the user stories and the frontend plan, and hold a
  request thread for the seconds-long model call.

## Consequences

- One configuration class fewer; no `@Async` anywhere. The whole class of
  `@EnableAsync` startup-order hazards is gone by construction — which matters before
  re-attempting Step 2, which adds Spring AI auto-configuration to the context.
- The background pool is Boot-managed: tune via `spring.task.execution.*`; threads
  show up as `task-*` instead of `brief-*` in logs.
- **Sharp edge:** an event published outside a transaction is **silently dropped**
  (the `@TransactionalEventListener` default). `trigger` is `@Transactional`, so this
  holds today; a future non-transactional caller would silently not generate.
- Durability is exactly as in ADR-003: in-process and fire-and-forget, so a JVM death
  mid-generation leaves a stuck `PENDING`; the DB-poller upgrade path there remains
  the designated fix.
