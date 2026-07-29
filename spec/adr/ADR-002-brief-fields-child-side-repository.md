# ADR-002 — Brief fields as a child entity with its own repository, not a JPA aggregate

**Status:** Accepted · supersedes the persistence shape in the 2.1.0 plan §1.2-1.3

## Context

A brief lives in two tables. `company_briefs` holds the metadata and the status.
`company_brief_fields` holds the content, one row per field per language, so four
fields across PL and EN is eight rows, always read together with the brief.

The implementation plan sketched the parent as a DDD-style aggregate root:
`CompanyBrief` would hold a `@OneToMany` collection of its fields with
`cascade = ALL` and `orphanRemoval`, and a single repository would save the whole
thing.

The rest of the codebase does the opposite, everywhere. Every parent-child pair —
`Application` to `Note`, `User` and `Application` to `ScreeningAnswer`, `User` to
`CV` — is modelled from the **child side**. The child holds a `@ManyToOne`
reference to its parent, the parent holds no collection, and the child has its
own repository that queries by parent id, as in
`NoteRepository.findByApplicationId`. There is not one `@OneToMany` in the whole
project.

So the plan would have introduced the codebase's first aggregate collection, in a
case where both shapes are technically fine.

## Decision

**Model `CompanyBriefField` from the child side, with its own repository**, the
same shape as `Note` and `ScreeningAnswer`.

1. `CompanyBriefField` holds `@ManyToOne CompanyBrief brief` with
   `@OnDelete CASCADE`. `CompanyBrief` holds no `fields` collection and stays
   metadata plus status.
2. A dedicated `CompanyBriefFieldRepository` reads and writes fields by brief id,
   through `findByBriefId` and `deleteByBriefId`. Generation and editing use it
   directly.
3. That gives the feature two repositories — exactly as the `Application`
   "aggregate" already spans `ApplicationRepository`, `NoteRepository` and
   `ScreeningAnswerRepository`.

## Alternatives rejected

- **The plan's `@OneToMany` aggregate.** It is defensible here, because the
  collection is small, bounded and always read together. But it would be a
  persistence pattern used nowhere else in the project, and it brings its own
  traps: the semantics of `cascade` and `orphanRemoval`, loading the whole
  collection to touch one row, and keeping both sides of the relation in sync.
  Consistency with four existing child-repository pairs is worth more than the
  marginal tidiness of having one repository.
- **A single repository over the aggregate.** Moot once the collection is
  dropped. The child gets its own repository, like every other child here.

## Consequences

- Two repositories, `CompanyBriefRepository` and `CompanyBriefFieldRepository`.
  That is the established shape rather than new complexity, and the second one is
  the direct analogue of `NoteRepository`.
- Deletes rely on the database foreign key `ON DELETE CASCADE`, exactly like the
  other child tables. No `orphanRemoval` machinery.
- Regeneration replaces a brief's fields with `deleteByBriefId` and a re-insert.
  It runs only for a fresh or retried brief, never a `READY` one, so it cannot
  overwrite a user edit.
- This sets a default for future entities: **prefer a child-side `@ManyToOne`
  with its own repository over a bidirectional `@OneToMany`**, unless true
  aggregate semantics are actually needed. That is also the Hibernate community's
  recommended default.
