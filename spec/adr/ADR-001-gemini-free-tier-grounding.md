# ADR-001 — Gemini free tier with search grounding, behind Spring AI

**Status:** Accepted · provider superseded by ADR-005 · egress list narrowed by ADR-006

## Context

Release 2.1.0 adds the first AI feature: a company brief, generated on demand
from public web data. Four constraints are hard.

- **Cost must be zero.** Free tiers only. No paid API, nothing new to host.
- **Privacy.** Only public job-ad data may leave the system: the company name and
  the job-ad link. Never the user's personal data, notes, answers or salary.
- **Grounded, never invented.** The brief must come from public web data. A field
  with too little information says so, instead of guessing.
- **Bilingual.** PL and EN must both be available without generating twice.

## Decision

1. **Provider: the Google Gemini 2.5 Flash free tier**, reached through Spring
   AI's `ChatModel` interface. Our code depends on that interface, never on a
   provider SDK.
2. **Grounding comes from the Gemini API's Google Search tool.** We do not scrape
   or crawl anything ourselves.
3. **One call, structured output.** A single request returns all four fields in
   both languages, each with a marker when there was not enough data. Freeform
   prose is not accepted.
4. **Grounded web content is untrusted input.** An indexed page can carry a
   prompt injection. The mitigation is that the brief is **display-only**: its
   content never triggers an action, a tool call or another feature. Any future
   feature that wants to *act* on brief content needs its own ADR.
5. **Quota discipline.** Separate API keys and projects for dev and prod, so
   experiments never burn production quota. Generation happens only on the user's
   click. A ready brief is final and never regenerates. Retry is manual, and only
   after a failure.
6. **Swappability is proven by a stub, not by a second live provider.** Unit
   tests run against a stub `ChatModel`. **Groq is the designated fallback** if
   Gemini's free-tier terms collapse.

## Alternatives rejected

- **A local model, Ollama on the VPS.** It adds a model runtime to host and size
  against limited VPS resources. More importantly it has no search grounding,
  which is the one capability the brief actually needs.
- **A paid tier, or a paid search API.** Breaks the cost-zero constraint.
- **Groq as the primary provider.** It has no built-in search grounding, so it
  would need its own search or scraping pipeline. Kept as the fallback instead.
- **A second live provider, to prove swappability.** That doubles key and quota
  management to demonstrate a property a stub test demonstrates for free.

## Consequences

- **The daily free-tier request limit is a product constraint, not a footnote.**
  It shaped the UX directly: the on-demand button, the final brief, the manual
  retry. The real limit has to be checked in Google AI Studio per project,
  because public reports of it disagree.
- The prompt and the output schema are tuned for Gemini. Swapping providers means
  reworking the prompt and the grounding as well as the config. The `ChatModel`
  boundary limits the blast radius but does not remove it.
- Free-tier terms can change without warning. The stub-tested abstraction and the
  Groq fallback are what bound the damage.
- The display-only rule has to survive future features. Relaxing it needs a new
  ADR.
