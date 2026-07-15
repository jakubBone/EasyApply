# ADR-003 — In-process `@Async` brief generation, no durable job machinery

> **Status:** Accepted (2026-07-12) · execution mechanism superseded by
> [ADR-004](ADR-004-transactional-event-brief-generation.md) (2026-07-14) — the
> no-broker / durability decision stands · **Scope:** release 2.1.0 (company brief) ·
> Formalizes the execution model behind
> [`../v2/2.1.0/03-company-brief/implementation-plan.md`](../v2/2.1.0/03-company-brief/implementation-plan.md)
> §1.6–1.7 and the cross-cutting DoD constraint "no queue, no scheduler, no new deployable".

## Context

Generating a brief means calling an LLM: it takes seconds and can fail. The request
thread must not wait for it — the trigger endpoint returns `202 PENDING` immediately
and the frontend polls `GET` until `READY`/`FAILED`.

The open question: **how** does the background work run, and what happens to a job if
the process dies mid-generation (durability)? Weighed against the deployment reality:
a single self-hosted monolith (one Hetzner box, `docker-compose`), one deliberate user
click per brief, low volume, a free-tier LLM. The release's DoD says it outright:
**no new infrastructure** beyond the Spring AI dependency.

## Decision

**Run generation in-process on a background thread; track the job nowhere beyond the
brief's own status row.**

1. `BriefGenerationWorker.generate` is `@Async("briefExecutor")` — a dedicated thread
   pool (`AsyncConfig`), fire-and-forget.
2. The work starts only **after** the trigger transaction commits (an `afterCommit`
   callback), so the background thread never looks for a `PENDING` row that is not in
   the database yet.
3. The only durable state is the status column (`PENDING → READY | FAILED`) in
   Postgres. There is **no** separate job or queue record.

## Alternatives considered

- **Message broker (Kafka / RabbitMQ / SQS)** — rejected. Gives durability and
  horizontal scale, but is a whole new service to run, secure and monitor — for a
  monolith whose "load" is one user clicking a button. Kafka in particular is a
  different scale class entirely; people reach for it by reflex, not by need.
- **DB-backed job + `@Scheduled` poller** — rejected **for now**, but this is the
  designated first upgrade. It is the only *cheap* path to durability: reuse Postgres
  and the existing `PENDING` row, add a scheduled job that picks up orphaned `PENDING`
  briefs (re-run or mark `FAILED`). No new deployable. Rejected as premature: the
  accepted risk below is unlikely and the workaround is a manual re-click. If that
  risk ever bites, **this is the change to make** — not a broker.
- **Spring Events (`@TransactionalEventListener`)** — not an alternative on this axis:
  it changes who *starts* the work, not where it *runs*, so it adds zero durability.
  Set aside here as churn without benefit. (ADR-004 later adopted it for code-quality
  reasons; the durability decision was unaffected.)

## Consequences

- **Accepted risk:** if the JVM dies mid-generation (deploy, crash, OOM), the brief
  stays `PENDING` forever — nothing picks it up.
- **Sharp edge to know:** a stuck `PENDING` is *not* `FAILED`, and retry is only
  allowed from `FAILED`, so re-clicking will **not** rescue it — the user sees a
  perpetual "generating…". Accepted because the window is seconds, a crash inside it
  is rare, and no data can be corrupted: generation only writes `edited=false` rows
  and never touches a `READY` brief. Deliberate, not an oversight.
- **Zero new infrastructure** — meets the cross-cutting DoD.
- `@EnableAsync` lives in its own `AsyncConfig` with an explicit named executor —
  never on `ApplikonApplication`, where it forces early bean initialization and breaks
  `@AuthenticationPrincipal` in all controllers (see `AsyncConfig`).
- **Upgrade path:** if durability becomes necessary, add the DB poller above before
  ever considering a broker. A queue would be a scale decision, not a fix for this
  limitation.
