# ADR-v1-002 — Flyway for versioned schema migrations

## Context

Schema needed to evolve through development and across deployments. Hibernate's `ddl-auto=update` automates it, but migrations are not versioned and changes are not auditable.

## Decision

**Use Flyway for all schema changes.** Migrations are SQL files in `db/migration/`, numbered `V1`, `V2`, etc.

- `ddl-auto=validate` mode: Hibernate only checks the schema matches the entities, never modifies it.
- Migration checksums prevent accidental edits.
- Every schema change is a git commit, reviewable and auditable.

## Consequences

- **Migrations are immutable.** A deployed migration cannot be edited; a fix is a new migration.
- **Easier to troubleshoot.** The migration history explains what changed and when.
- **Team-friendly.** Multiple developers' migrations combine without conflict; the sequence is the order of execution.
