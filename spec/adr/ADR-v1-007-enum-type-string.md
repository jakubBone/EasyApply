# ADR-v1-007 — `EnumType.STRING` for every enum column

## Context

Nine columns across six entities persist a Java enum — application status, recruitment stage, CV type, brief status, note type, notice severity. JPA's default for `@Enumerated` is `ORDINAL`.

## Decision

Every `@Enumerated` is `EnumType.STRING`. No exceptions, including enums that look like they will never grow.

## Alternatives rejected

- **`ORDINAL`** (the JPA default) — stores the constant's position in the enum. Inserting a constant in the middle, or reordering them, silently changes what every existing row means. Nothing fails: no exception, no failing test, no migration error. Hibernate starts, the constraint still validates, the data is just wrong from then on. A corruption with no signal is worse than a compile error, however cheap the compile error would have been.

## Consequences

- A few bytes more per row and slightly larger indexes. Irrelevant at this size.
- Renaming a constant becomes a schema concern: the Java rename has to ship with a Flyway migration that rewrites the stored values ([ADR-v1-002](ADR-v1-002-flyway-versioned-migrations.md)). With `ORDINAL` it would have been free — and that is the trade, paid deliberately.
- Rows are readable in `psql`, which is worth more than it sounds when reading production data.
