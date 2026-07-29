# ADR-004 — Brief generation via a transactional event on Boot's executor

**Status:** Accepted · supersedes the execution mechanism of ADR-003, whose no-broker and durability decision stands

## Context

Step 1 shipped background generation exactly as planned. The wiring had three
hand-made parts:

- **`@Async` on the worker**, running it on its own thread pool, which required
  `@EnableAsync` and an `AsyncConfig` class;
- **a hand-registered "run this after commit" callback** in `BriefService.trigger`,
  so the background thread would not start before the `PENDING` row was
  committed;
- **a self-proxy**: the worker injected *itself*, in order to reach its own
  `@Transactional` methods through the Spring proxy. A plain call on `this`
  bypasses the proxy and runs with no transaction at all.

It worked, and it was fully tested. Three costs showed up after shipping.

**It is hand-rolled code where Spring has one built-in idiom.** The after-commit
callback and the self-proxy are both workarounds.
`@TransactionalEventListener(AFTER_COMMIT)` states the same contract — run this
only after the commit — in one annotation. Moving the transactional writes to a
different bean removes the self-call problem outright instead of routing around
it.

**`@EnableAsync` was a suspect in two startup bugs.** It registers a
bean-post-processor: a component Spring builds before the normal beans, which
forces its own dependencies to initialise early, before the context is fully
configured. That early initialisation was the prime suspect when
`@AuthenticationPrincipal` came back `null` in every controller during Step 1,
and again when the first attempt at Step 2 had to be rolled back. While the
annotation stays in the context, every future startup-order bug begins with the
same suspect.

**One maintainer has to be able to debug it.** The owner could not confidently
reason about the self-proxy and the callback code. On a one-person project, code
the maintainer cannot debug is a liability even when the tests are green.

## Decision

Replace the wiring and keep the behaviour.

1. `BriefService.trigger` publishes a `BriefGenerationRequested` event inside its
   transaction.
2. `BriefGenerationWorker.on` listens with
   `@TransactionalEventListener(phase = AFTER_COMMIT)`, so Spring delivers the
   event only once the `PENDING` row is committed. The listener hands the slow
   model call to Boot's own `applicationTaskExecutor` and returns immediately.
3. `markReady` and `markFailed` move to `BriefService` as plain `@Transactional`
   methods. The worker calls them on a normally injected bean, so the proxy just
   works and no self-proxy is needed.
4. Deleted: `AsyncConfig`, `@EnableAsync`, the `briefExecutor` pool, the
   self-proxy and the manual callback. The feature keeps no proxy machinery
   beyond `@Transactional`.

The API contract does not change: same endpoints, statuses, idempotency and retry
rules. `BriefControllerTest` passed untouched. `BriefServiceTest` was adapted,
because it tested the old wiring directly, and gained unit tests for `markReady`
and `markFailed`.

## Alternatives rejected

- **Keep the Step 1 wiring.** It works, but it carries all three costs above and
  buys nothing over the built-in idiom.
- **`@Async` on the event listener.** This is the textbook variant, rejected
  because it keeps `@EnableAsync` in the context. Handing the call to the
  executor explicitly does the same job with strictly less machinery.
- **Synchronous generation, with no background work.** It would rework the
  shipped 202-and-poll contract, the user stories and the frontend plan, and it
  would hold a request thread for the whole model call.

## Consequences

- One configuration class fewer, and no `@Async` anywhere. The entire class of
  `@EnableAsync` startup-order hazards is gone by construction, which matters
  before re-attempting Step 2 and adding Spring AI's auto-configuration to the
  context.
- The background pool is Boot-managed. It is tuned through
  `spring.task.execution.*`, and its threads appear in logs as `task-*` rather
  than `brief-*`.
- **A sharp edge worth knowing:** an event published outside a transaction is
  **silently dropped**, which is the `@TransactionalEventListener` default.
  `trigger` is `@Transactional`, so this holds today, but a future
  non-transactional caller would simply never generate.
- Durability is exactly as in ADR-003. Generation is in-process and fire and
  forget, so a JVM death mid-generation leaves a stuck `PENDING`, and the
  database-poller upgrade path described there remains the designated fix.
