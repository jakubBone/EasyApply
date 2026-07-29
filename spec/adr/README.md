# Architecture Decision Records

An ADR is written when a decision was genuinely contested: there were real
alternatives, and the consequences outlive the release. A conventional choice
does not get one.

| # | Decision | Status |
|---|----------|--------|
| [001](ADR-001-gemini-free-tier-grounding.md) | Gemini free tier with search grounding, behind Spring AI | Provider superseded by 005; egress list narrowed by 006 |
| [002](ADR-002-brief-fields-child-side-repository.md) | Brief fields as a child-side entity with its own repository | Accepted |
| [003](ADR-003-in-process-async-brief-generation.md) | In-process background generation, no durable job machinery | Execution mechanism superseded by 004 |
| [004](ADR-004-transactional-event-brief-generation.md) | Generation via a transactional event on Boot's executor | Accepted |
| [005](ADR-005-groq-compound-brief-provider.md) | Groq compound replaces Gemini grounding as the provider | Accepted |
| [006](ADR-006-drop-job-ad-link-from-brief-prompt.md) | The job-ad link leaves the brief prompt | Accepted |

## Why the numbering starts at release 2.1.0

The practice started there. Releases 1.0.0 and 1.1.0 were built before I was
writing ADRs, and their decisions are not re-created here from memory — an ADR
written months after the fact is a story, not a record.

Their reasoning is written down, in the place that suits it: `as-built.md` for
each release explains why the build differs from the plan, covering Flyway
instead of `ddl-auto`, CORS inside `SecurityConfig`, removing stage history, and
the move to link-only CVs. Anything narrower lives in the topic's own `brief.md`.
