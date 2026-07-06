# ADR-001 — Gemini free tier with search grounding, behind Spring AI

> **Status:** Accepted (2026-07-06) · **Scope:** release 2.1.0 (company brief) ·
> First ADR in the repo — earlier releases made no genuinely contested
> architectural decision; their rationale lives in the phase briefs and
> `as-built.md`.

## Context

Release 2.1.0 adds the first AI feature: an on-demand, grounded company brief
([`../v2/2.1.0/03-company-brief/brief.md`](../v2/2.1.0/03-company-brief/brief.md)).
Hard constraints:

- **Cost = 0** — free tiers only, no paid API, nothing new to host.
- **Privacy** — only public job-ad data (company name, job-ad link) may leave the
  system; never user PII, notes, answers, or salary.
- **Grounded, never invented** — the brief must come from public web data, with
  an explicit per-field "not enough public info" state instead of guesses.
- **Bilingual** — PL and EN must both be available without a second generation.

## Decision

1. **Provider: Google Gemini (2.5 Flash) free tier**, accessed through Spring
   AI's `ChatModel` abstraction — application code depends on the abstraction,
   never on a provider SDK.
2. **Grounding: the Gemini API's Google Search grounding tool** supplies the
   public company data. No scraping or crawling of our own.
3. **Structured output, one call**: a single request returns all 4 brief fields
   in both PL and EN, plus per-field insufficient-data markers. Freeform prose
   is not accepted.
4. **Trust boundary: grounded web content is untrusted input.** Indexed pages
   can carry prompt injection. Mitigation: the brief is **display-only** — its
   content never triggers actions, tool calls, or other features. Anything that
   later wants to *act* on brief content requires a new decision (new ADR).
5. **Quota discipline:** separate API keys/projects for dev and prod (dev
   experiments never burn prod quota); generation only on the user's click; a
   ready brief is final (no regeneration); retry is manual and only after
   failure.
6. **Swappability proven by a stub**, not a second live provider: unit tests run
   against a stub `ChatModel`. **Groq is the designated fallback** if Gemini's
   free-tier terms collapse.

## Alternatives considered

- **Local model (Ollama on the VPS)** — rejected: adds a model runtime to host
  and size against VPS resources, and above all has **no search grounding**, the
  one capability the brief actually needs.
- **Paid tier / paid search API** — rejected: violates the cost-0 constraint.
- **Groq as primary** — rejected: no built-in search grounding, so it would need
  its own search/scraping pipeline; kept as the fallback chat provider.
- **Second live provider to prove swappability** — rejected: doubles key/quota
  management to prove a property a stub test proves for free.

## Consequences

- **Daily free-tier request limits are a product constraint**, not a footnote —
  they directly shaped the UX (on-demand button, final brief, manual retry).
  Actual requests-per-day must be verified in Google AI Studio per project;
  public reports of the limit disagree.
- The prompt and output schema are Gemini-tuned. A provider swap is **config
  plus prompt/grounding rework**, not config alone — the `ChatModel` boundary
  contains the blast radius but does not eliminate it.
- Free-tier terms can change unilaterally; the stub-tested abstraction and the
  Groq fallback bound the damage.
- The display-only rule must survive future features; relaxing it is a new ADR.
