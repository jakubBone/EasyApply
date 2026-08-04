# ADR-v1-003 — React Query for data fetching

## Context

The frontend needed to fetch API data: applications, notes, answers. Plain `fetch()` works, but requires custom logic for caching, retries, and optimistic updates — each a common source of bugs.

## Decision

**Use TanStack Query (React Query) as the data layer.**

- Automatic caching: the same query is not fetched twice in quick succession.
- Automatic retries: failed requests retry with exponential backoff.
- Optimistic updates: update the UI immediately, roll back if the API call fails.
- Devtools: a browser extension shows every query and its state.

## Consequences

- **One more dependency.** React Query adds ~30KB (minified).
- **Learning curve.** Async state is modeled differently than plain fetch; takes practice.
- **Reliability boost.** Fewer race conditions, retries, and stale-data bugs than hand-rolled fetch.
