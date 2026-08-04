# Architecture Decision Records

An ADR is written when a decision was genuinely contested: there were real
alternatives, and the consequences outlive the release. A conventional choice
does not get one.

## v1

| # | Decision |
|---|----------|
| [v1-001](ADR-v1-001-oauth2-jwt.md) | OAuth2 + JWT authentication |
| [v1-002](ADR-v1-002-flyway-versioned-migrations.md) | Flyway for versioned schema migrations |
| [v1-003](ADR-v1-003-react-query.md) | React Query for data fetching |
| [v1-004](ADR-v1-004-monolith-single-vps.md) | Monolith and one Postgres on a single VPS |
| [v1-005](ADR-v1-005-layered-not-hexagonal.md) | Layered architecture, not hexagonal |
| [v1-006](ADR-v1-006-in-memory-rsa-key.md) | RSA signing key generated in memory at startup |
| [v1-007](ADR-v1-007-enum-type-string.md) | `EnumType.STRING` for every enum column |
| [v1-008](ADR-v1-008-no-soft-delete.md) | No soft delete — account deletion really deletes |

## v2

| # | Decision |
|---|----------|
| [v2-001](ADR-v2-001-brief-provider-strategy.md) | Brief provider: Groq `compound-mini`, both adapters behind the port |
| [v2-002](ADR-v2-002-in-process-async-brief-generation.md) | In-process background generation, no durable job machinery |
| [v2-003](ADR-v2-003-drop-job-ad-link-from-brief-prompt.md) | The job-ad link leaves the brief prompt |
