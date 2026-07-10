# 2.1.0 — As-Built

> Differences between plan and what shipped, with why. Source of truth: the code.
> Deviations from [`03-company-brief/implementation-plan.md`](03-company-brief/implementation-plan.md)
> land here as steps ship; plan files are never edited after the fact.

## Step 1 — Backend

- **Brief content persistence — child-side entity + own repository, not a JPA aggregate.**
  Plan §1.2–1.3 specified `CompanyBrief` as an aggregate root with a `@OneToMany` fields
  collection and a **single** repository. Built instead as the codebase's uniform child-side
  pattern (like `Note`/`NoteRepository`): `CompanyBriefField` holds `@ManyToOne CompanyBrief`,
  `CompanyBrief` has no collection, and a dedicated `CompanyBriefFieldRepository` reads/writes
  by brief id — **two repositories**. Rationale and rejected alternatives in
  [`../../adr/ADR-002-brief-fields-child-side-repository.md`](../../adr/ADR-002-brief-fields-child-side-repository.md).
- **Table names** aligned to the plan: `company_briefs` + `company_brief_fields`
  (migration `V21`), constraints `uq_company_brief` / `uq_brief_field`.
- **`FakeBriefChatModel` lives in `src/test`** (`@Profile("test")`), mirroring `TestSecurityConfig`,
  rather than `src/main` as the plan's file map listed — test doubles stay out of the production jar.
