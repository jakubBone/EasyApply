# ADR-002 — Brief fields as a child-side entity with its own repository, not a JPA aggregate

> **Status:** Accepted (2026-07-10) · **Scope:** release 2.1.0 (company brief) ·
> Supersedes the persistence shape sketched in
> [`../v2/2.1.0/03-company-brief/implementation-plan.md`](../v2/2.1.0/03-company-brief/implementation-plan.md)
> §1.2–1.3 (aggregate `@OneToMany`, single repository).

## Context

A company brief is a `company_briefs` row (metadata + status) plus its content in
`company_brief_fields` — one row per (field × language), 4 fields × the active
locales (today PL + EN = 8 rows), bounded and always read together with the brief.

The implementation plan proposed modelling `CompanyBrief` as a DDD-style aggregate
root: a `@OneToMany` collection of fields with `cascade = ALL` + `orphanRemoval`,
persisted through a **single** `CompanyBriefRepository`.

The rest of the codebase does the opposite, uniformly. Every parent/child pair —
`Application`→`Note`, `User`/`Application`→`ScreeningAnswer`, `User`→`CV` — is
modelled from the **child side**: the child holds a `@ManyToOne` back-reference,
the parent holds **no** collection, and each child has its **own** repository that
queries by the parent id (`NoteRepository.findByApplicationId`, etc.). There is
**not a single `@OneToMany`** in the project.

So the plan would introduce the codebase's first aggregate collection for a case
where both shapes are technically defensible.

## Decision

**Model `CompanyBriefField` as a child-side entity with its own repository**, matching
the existing `Note` / `ScreeningAnswer` pattern:

1. `CompanyBriefField` holds `@ManyToOne CompanyBrief brief` (`@OnDelete CASCADE`).
   `CompanyBrief` holds **no** `fields` collection — it stays metadata + status only.
2. A dedicated `CompanyBriefFieldRepository` reads and writes fields by brief id
   (`findByBriefId`, `deleteByBriefId`). Generation and editing go through it directly.
3. This is two repositories for the feature, exactly as the `Application` "aggregate"
   already spans `ApplicationRepository` + `NoteRepository` + `ScreeningAnswerRepository`.

## Alternatives considered

- **Aggregate `@OneToMany` on `CompanyBrief` (the plan's shape)** — rejected. It is a
  legitimate aggregate here (small, bounded, co-accessed), but it introduces a
  persistence pattern the codebase uses nowhere else, along with its own footguns
  (`cascade`/`orphanRemoval` semantics, full-collection loads, bidirectional
  set-both-sides sync helpers). Consistency with four existing child/repo pairs
  outweighs the marginal "one repository" tidiness.
- **Single repository over the aggregate** — moot once the collection is dropped; the
  child gets its own repository like every other child in the project.

## Consequences

- The feature has two repositories (`CompanyBriefRepository`,
  `CompanyBriefFieldRepository`). This is the established shape, not new complexity —
  `CompanyBriefFieldRepository` is the direct analogue of `NoteRepository`.
- Deletes rely on the DB FK `ON DELETE CASCADE` (account deletion) exactly as the
  other child tables do; no `orphanRemoval` machinery.
- Regeneration replaces a brief's fields via `deleteByBriefId` + re-insert, only ever
  from a fresh or retried (FAILED) brief — it never runs for a READY brief, so it
  cannot clobber a user edit.
- The general default this encodes — **prefer a child-side `@ManyToOne` + repository
  over a bidirectional `@OneToMany`** unless true aggregate semantics are required — is
  the Hibernate-community-recommended default and now applies to future entities too.
- The implementation plan's §1.2–1.3 are superseded by this ADR; the
  `as-built.md` records the built shape.
