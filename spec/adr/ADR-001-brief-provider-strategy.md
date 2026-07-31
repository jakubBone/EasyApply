# ADR-001 — Brief provider strategy: Groq with fallback plan

**Status:** Accepted · provider is Groq after Gemini free tier closed

## Context

A company brief is generated on demand from public web data. Two constraints are hard:
- **Cost zero.** Free tiers only.
- **Grounded, never invented.** The brief comes from public web, never from model memory.

Initially this suggested Gemini 2.5 Flash with search grounding. But in Step 2b, Gemini's free-tier grounding disappeared: 429 quota exceeded on new accounts, and the 2.5 models are closed to new users.

## Decision

**Use Groq `compound-mini`** (has free-tier web search). Keep code depending on a `ChatModel` interface, never on a provider SDK. Generation is on-demand, one call covers all fields in both languages, with explicit "insufficient data" markers.

**Both adapters stay behind the interface** — Gemini (dormant) and Groq (active) — selected by `brief.provider` in `application.properties`. Switching is config, not code.

**If Groq's free tier collapses**, revert to Gemini or pick another provider. The port and dormant adapter are the exit plan.

## Alternatives rejected

- Paid tiers: breaks cost-zero constraint.
- Local model (Ollama): adds VPS runtime; no search grounding.
- Our own search pipeline: doubles key and quota management.

## Consequences

- Free-tier terms are a product dependency that can change without notice.
- Grounding quality depends on provider's server-side search.
- The prompt is tuned to the active provider; swapping means reworking the prompt too.
