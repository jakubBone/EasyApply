# ADR-v1-004 — Monolith and one Postgres on a single VPS

## Context

Applikon is one product, built and run by one person, deployed on a single Hetzner VPS behind Caddy. `docker-compose` brings up three containers: Postgres 16, the Spring Boot backend, the frontend. The question was whether the backend should be more than one deployable.

## Decision

One Spring Boot application, one database, one machine. The machine grows before the system splits.

## Alternatives rejected

- **Microservices** — every boundary I could draw (applications, CVs, briefs) sits behind the same user and inside the same transaction. Splitting them buys independent deploys I do not need and costs me distributed transactions I would then have to write.
- **Managed cloud (RDS + a container platform)** — the operational win is real. It is not worth the bill at this traffic, and nothing about it is visible to a user.

## Consequences

- Single point of failure. The VPS *is* the availability story, and a deploy is downtime.
- No horizontal scaling. Anything that quietly assumes one process is fine today and breaks the day there are two — the in-memory signing key ([ADR-v1-006](ADR-v1-006-in-memory-rsa-key.md)) is the concrete example.
- The trigger to revisit this is traffic that stops fitting on one machine. Not a fashion, and not an interview question.
