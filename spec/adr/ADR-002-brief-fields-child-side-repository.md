# ADR-002 — Brief fields as a child-side entity with its own repository, not a JPA aggregate

> **Status:** Accepted (2026-07-10) · **Scope:** release 2.1.0 (company brief) ·
> Supersedes the persistence shape sketched in
> [`../v2/2.1.0/03-company-brief/implementation-plan.md`](../v2/2.1.0/03-company-brief/implementation-plan.md)
> §1.2–1.3 (aggregate `@OneToMany`, single repository).

## Context

A brief is stored in two tables: `company_briefs` (metadata + status) and
`company_brief_fields` (the content — one row per field per language; 4 fields ×
PL + EN = 8 rows today, always read together with the brief).

The implementation plan sketched the parent as a DDD-style aggregate root:
`CompanyBrief` holds a `@OneToMany` collection of its fields (`cascade = ALL`,
`orphanRemoval`) and a **single** repository saves the whole thing.

The rest of the codebase does the opposite, everywhere. Every parent/child pair —
`Application`→`Note`, `User`/`Application`→`ScreeningAnswer`, `User`→`CV` — is
modelled from the **child side**: the child holds a `@ManyToOne` reference to its
parent, the parent holds **no** collection, and the child has its **own** repository
that queries by parent id (`NoteRepository.findByApplicationId`, etc.). There is not
a single `@OneToMany` in the project.

So the plan would have introduced the codebase's first aggregate collection, for a
case where both shapes are technically defensible.

## Decision

**Model `CompanyBriefField` from the child side, with its own repository** — the same
shape as `Note` and `ScreeningAnswer`:

1. `CompanyBriefField` holds `@ManyToOne CompanyBrief brief` (`@OnDelete CASCADE`).
   `CompanyBrief` holds **no** `fields` collection — it stays metadata + status only.
2. A dedicated `CompanyBriefFieldRepository` reads and writes fields by brief id
   (`findByBriefId`, `deleteByBriefId`). Generation and editing go through it directly.
3. That makes two repositories for the feature — exactly as the `Application`
   "aggregate" already spans `ApplicationRepository` + `NoteRepository` +
   `ScreeningAnswerRepository`.

## Alternatives considered

- **The plan's `@OneToMany` aggregate** — rejected. It is defensible here (small,
  bounded, read together), but it would be a persistence pattern the codebase uses
  nowhere else, with its own traps: `cascade`/`orphanRemoval` semantics, loading the
  whole collection to touch one row, keeping both sides of the relation in sync.
  Consistency with four existing child/repository pairs outweighs the marginal
  tidiness of "one repository".
- **Single repository over the aggregate** — moot once the collection is dropped;
  the child gets its own repository like every other child in the project.

## Consequences

- Two repositories (`CompanyBriefRepository`, `CompanyBriefFieldRepository`) — the
  established shape, not new complexity; `CompanyBriefFieldRepository` is the direct
  analogue of `NoteRepository`.
- Deletes rely on the DB FK `ON DELETE CASCADE` (account deletion), exactly like the
  other child tables; no `orphanRemoval` machinery.
- Regeneration replaces a brief's fields via `deleteByBriefId` + re-insert. It only
  runs for a fresh or retried (FAILED) brief, never a READY one, so it cannot
  overwrite a user edit.
- The default this sets — **prefer a child-side `@ManyToOne` + own repository over a
  bidirectional `@OneToMany`** unless true aggregate semantics are required — is also
  the Hibernate community's recommended default, and now applies to future entities.
- The implementation plan's §1.2–1.3 are superseded by this ADR; the `as-built.md`
  records the built shape.
