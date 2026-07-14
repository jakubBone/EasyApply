# ADR-003 — In-process `@Async` brief generation, no durable job machinery

> **Status:** Accepted (2026-07-12) · execution mechanism superseded by
> [ADR-004](ADR-004-transactional-event-brief-generation.md) (2026-07-14) — the
> no-broker / durability decision stands · **Scope:** release 2.1.0 (company brief) ·
> Formalizes the execution model behind
> [`../v2/2.1.0/03-company-brief/implementation-plan.md`](../v2/2.1.0/03-company-brief/implementation-plan.md)
> §1.6–1.7 and the cross-cutting DoD constraint "no queue, no scheduler, no new deployable".

## Context

Generating a brief is a slow, unreliable external call (the LLM — seconds, may fail).
It must not block the request thread: the trigger endpoint returns `202 PENDING`
immediately and the work runs in the background (Asynchronous Request-Reply — the
frontend polls `GET` until `READY`/`FAILED`).

The open question is **how** that background work runs and **how durable** the job is —
i.e. what happens to an in-flight generation if the process dies. This has to be
weighed against the deployment reality: a single self-hosted monolith (one Hetzner
box, `docker-compose`), one deliberate user click per brief, low volume, a free-tier
LLM. The release's cross-cutting DoD makes it explicit: **no new infrastructure**
beyond the Spring AI dependency.

## Decision

**Run generation in-process with Spring `@Async` on a named thread pool; do not persist
the job beyond the brief's own status row.**

1. `BriefGenerationWorker.generate` is `@Async("briefExecutor")` — a dedicated
   `ThreadPoolTaskExecutor` (`AsyncConfig`), fire-and-forget.
2. It is scheduled **after** the trigger transaction commits (an `afterCommit`
   synchronization), so the background thread never reads a `PENDING` row that has not
   been committed yet.
3. The only durable state is the `company_briefs.status` machine
   (`PENDING → READY | FAILED`) in Postgres. There is **no** separate job/queue record.

## Alternatives considered

- **Message broker — Kafka / RabbitMQ / SQS** — rejected. Gives durability and
  horizontal scale, but is a whole new deployable to run, secure and monitor for a
  monolith whose "load" is one user clicking a button. Gross over-provisioning; a
  direct violation of the zero-infra constraint. Kafka in particular is a different
  scale class entirely — not a peer option here, just the thing people reach for by
  reflex.
- **DB-backed job + `@Scheduled` poller** — rejected **for now**, but kept as the
  designated first upgrade. It is the only *cheap* path to durability: reuse Postgres
  and the existing `PENDING` row, add a scheduled job that reclaims orphaned `PENDING`
  briefs (re-run or mark `FAILED`). No new deployable. Rejected as premature — the
  accepted risk below is low-probability and the mitigation is a manual re-click. If
  that risk ever bites, **this is the change to make**, not a broker.
- **Spring Events (`@TransactionalEventListener`)** — not an alternative on this axis.
  It only decouples "who triggers" from "who runs"; execution still rides the same
  in-memory `@Async` pool, so it adds **zero** durability. It is interchangeable with
  the `afterCommit` synchronization we use, and was set aside as churn without benefit.

## Consequences

- **Accepted risk:** a brief left `PENDING` because the JVM died mid-generation (deploy,
  crash, OOM) never resolves on its own — nothing reclaims it. It stays `PENDING`.
- **Sharp edge to know:** a stuck `PENDING` is *not* `FAILED`, and retry is allowed only
  from `FAILED`, so the normal re-click will **not** rescue it — the user sees a
  perpetual "generating…". Acceptable because crash-mid-generation is rare, generation
  takes seconds (a narrow window), and no data is corrupted (generation only ever writes
  `edited=false` rows, never for a `READY` brief). This is deliberate, not an oversight.
- **Zero new infrastructure** — meets the cross-cutting DoD; nothing new to deploy or
  operate.
- `@EnableAsync` is isolated in its own `AsyncConfig` with an explicit named executor —
  never on `ApplikonApplication`, where it forces early bean init and breaks
  `@AuthenticationPrincipal` across all controllers (see `AsyncConfig`).
- **Documented upgrade path:** if durability becomes necessary, add the DB poller above —
  a scheduler + a reclaim query over the `PENDING` rows that already exist — before ever
  considering a broker. Reaching for a queue would be a scale decision, not a fix for
  this limitation.
