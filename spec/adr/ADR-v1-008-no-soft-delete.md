# ADR-v1-008 — No soft delete: account deletion really deletes

## Context

GDPR Art. 17 gives a user the right to erasure. Applikon stores exactly the kind of thing people do not want left behind: which employers they applied to, what salary they asked for, and private notes about how an interview went.

## Decision

`UserService.deleteAccount` deletes for real, in foreign-key order — CV files from disk, then notes, applications, CVs, screening answers, and finally the user row. There is no `deleted` flag anywhere in the schema.

## Alternatives rejected

- **A `deleted` boolean** — the common default, and it does make support and analytics easier. Rejected: hidden is not erased, and the promise in the privacy policy is erasure. It also puts a filter obligation on every query in the system from then on, where the one place that forgets it leaks precisely the data that was supposed to be gone.

## Consequences

- No undo. Deletion is final, which is why the JSON export at `GET /api/auth/me/export` exists and is offered first.
- No retention of churned-user data for analytics. Accepted; there are no analytics.
- Every new entity that references a user has to be added to `deleteAccount` by hand. That is the obvious place for this decision to rot, and it is worth checking whenever the schema grows.
