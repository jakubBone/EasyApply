# ADR-v1-005 — Layered architecture, not hexagonal

## Context

The backend needed a shape before the first endpoint. The realistic options were classic layers or ports and adapters.

## Decision

Layers: `controller → service → repository`, with `dto`, `entity`, `security` and `config` alongside. Controllers validate DTOs, services own transactions and business rules, repositories are Spring Data JPA interfaces. Entities never leave the service layer — responses are DTO records.

## Alternatives rejected

- **Ports and adapters (hexagonal)** — with one database and one entry channel, every port would have exactly one adapter, forever. That is ceremony: interfaces whose only implementation is the thing I already have, plus a mapping layer between a domain model and an entity model that would be identical.

## Consequences

- The service layer knows about JPA. Entities *are* the domain model; there is no second one.
- Replacing Postgres would be a rewrite of the service layer rather than a new adapter. Accepted — I am not replacing Postgres.
- One port exists, where it earned its place: `BriefChatModel` ([ADR-v2-001](ADR-v2-001-brief-provider-strategy.md)), because the AI provider actually changed mid-build. The rule is not "no abstractions", it is "an abstraction needs a second implementation that already exists or is already coming".
- The trigger to revisit this is a second entry channel. The MCP server planned in `spec/post/mcp-server/` is that trigger, and its own ADR is scheduled before that work starts.
