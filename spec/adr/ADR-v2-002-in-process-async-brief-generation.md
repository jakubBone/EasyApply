# ADR-v2-002 — In-process brief generation, no durable job machinery

## Context

Generating a brief means calling an LLM. It takes seconds and it can fail, so the
request thread must not wait for it. The trigger endpoint returns `202` with
status `PENDING` straight away, and the frontend polls until `READY` or `FAILED`.

The open question is **how** the background work runs, and what happens to a job
if the process dies halfway through. That is the durability question.

It has to be weighed against the actual deployment: a single self-hosted monolith
on one Hetzner box under `docker-compose`, one deliberate user click per brief,
low volume, and a free-tier LLM. The release says it outright — **no new
infrastructure** beyond the Spring AI dependency.

## Decision

**Run generation in-process on a background thread, and track the job nowhere
beyond the brief's own status row.**

1. The worker runs on a dedicated thread pool, fire and forget.
2. The work starts only **after** the trigger transaction commits, so the
   background thread never looks for a `PENDING` row that is not in the database
   yet.
3. The only durable state is the status column in Postgres, moving from `PENDING`
   to `READY` or `FAILED`. There is no separate job or queue record.

## Alternatives rejected

- **A message broker such as Kafka, RabbitMQ or SQS.** It gives durability and
  horizontal scale, but it is a whole new service to run, secure and monitor —
  for a monolith whose load is one person clicking a button. Kafka in particular
  is a different scale class entirely, and it gets reached for by reflex rather
  than by need.
- **A database-backed job with a `@Scheduled` poller.** Rejected **for now**, but
  this is the designated first upgrade. It is the only cheap path to durability:
  reuse Postgres and the existing `PENDING` row, and add a scheduled job that
  picks up orphaned briefs and either re-runs them or marks them `FAILED`. No new
  deployable. It is premature because the risk below is unlikely and the
  workaround is a manual re-click. If that risk ever bites, **this is the change
  to make** — not a broker.
- **Spring events.** Not an alternative on this axis. They change who *starts*
  the work, not where it *runs*, so they add no durability at all. They replaced
  `@Async` later, for code-quality reasons, which left this decision untouched.

## Consequences

- **Accepted risk:** if the JVM dies mid-generation, during a deploy, a crash or
  an out-of-memory kill, the brief stays `PENDING` forever. Nothing picks it up.
- **A sharp edge worth knowing:** a stuck `PENDING` is not `FAILED`, and retry is
  allowed only from `FAILED`. So re-clicking will **not** rescue it, and the user
  sees a permanent "generating…". This is accepted because the window is seconds
  wide, a crash inside it is rare, and no data can be corrupted — generation only
  ever writes `edited=false` rows and never touches a `READY` brief. It is
  deliberate, not an oversight.
- **No new infrastructure**, which is what the release required.
- **Upgrade path:** if durability becomes necessary, add the database poller
  described above before even considering a broker. A queue would be a scaling
  decision, not a fix for this limitation.
