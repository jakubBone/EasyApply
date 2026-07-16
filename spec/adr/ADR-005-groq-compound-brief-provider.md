# ADR-005 — Groq compound replaces Gemini grounding as the brief provider

> **Status:** Accepted (2026-07-16) · **Scope:** release 2.1.0 (company brief) ·
> Supersedes the **provider and grounding choice** of
> [ADR-001](ADR-001-gemini-free-tier-grounding.md) (§1–2); every other ADR-001
> clause — privacy, structured single call, display-only trust boundary, quota
> discipline — stands unchanged. This is the fallback ADR-001 §6 designated,
> executed.

## Context

Step 2b shipped the Gemini adapter exactly as planned, and it never produced a
single brief. Verified on 2026-07-16 against live APIs and Google's own docs:

- Every grounded request returned **429 quota exceeded** despite near-zero
  usage — grounded generation is a **separate quota pool** from plain
  generation, and on the free tier that pool is empty.
- Google's pricing page: Grounding with Google Search is **"Not available"**
  on the free tier for the entire Gemini 3.x family (billing for it began
  2026-01-05 per the release notes). The paid tier gets 5,000 grounded
  prompts/month free — but requires a linked card.
- The only models with free-tier grounding (2.5-flash, 2.5-flash-lite,
  500 RPD) return **404 "no longer available to new users"** — verified live
  with this project's key.

ADR-001's two constraints — **cost = 0** and **grounded, never invented** —
became mutually unsatisfiable on Gemini for a new project. ADR-001 §6 named
Groq the fallback if "Gemini's free-tier terms collapse"; they did. ADR-001
also assumed Groq "has no built-in search grounding" — that is no longer true:
Groq's **compound** systems run web search server side, exactly the capability
gap that originally disqualified it.

## Decision

1. **Provider: Groq `groq/compound-mini`** via Groq's OpenAI-compatible API,
   accessed through Spring AI's OpenAI starter — still only the `ChatModel`
   abstraction, no provider SDK in application code. Web search runs server
   side (one tool call per request; a brief needs exactly one).
2. **Both adapters stay in the codebase behind the `BriefChatModel` port**,
   selected by the `brief.provider` property (`groq` active, `gemini` kept).
   `spring.ai.model.chat` flips with it so exactly one chat auto-configuration
   is active. Switching back is configuration, not code.
3. **Prompt and parsing are duplicated across the two adapters on purpose** —
   two similar files beat a premature shared abstraction while one adapter is
   dormant. Consolidation is warranted only if a third provider appears.
4. **ADR-001's remaining clauses carry over verbatim**: only company name +
   job-ad link enter the prompt; one structured call, all fields × locales,
   per-field insufficient markers, no partial briefs; brief content stays
   display-only (searched web content is still untrusted input); separate
   dev/prod keys — now `GROQ_API_KEY`.

## Alternatives considered

- **Gemini paid Tier 1** (5,000 grounded prompts/month free, then $14/1k) —
  rejected: requires a card on file; violates the cost-0 constraint even if the
  realistic monthly bill rounds to zero.
- **Gemini free tier without grounding** — rejected: violates "grounded, never
  invented"; briefs from model memory hallucinate or go stale for exactly the
  small companies the feature exists for.
- **Gemini `url_context` tool** (free on the free tier) — the model reads the
  job-ad page but cannot research the company; partial grounding at best, and
  Spring AI 1.1.8 does not expose the tool (raw SDK required). Noted as a
  possible future complement, not a replacement.
- **Own search pipeline** (Brave/Tavily free tier + any LLM) — rejected: a
  second external service, key and quota to manage, to rebuild what compound
  ships built in.
- **xAI Grok Live Search** — rejected: $25 starter credits expire after 30
  days; not durable cost-0.

## Consequences

- **Grounding quality now depends on Groq's server-side search** (models:
  GPT-OSS 120B / Llama). Citation metadata differs from Gemini's; the brief
  pipeline never surfaced citations, so nothing user-visible changes.
- **Two chat starters sit on the classpath with exactly one active.** The
  `brief.provider` + `spring.ai.model.chat` pair must move together; the
  properties file documents the pairing.
- **Groq's free tier can collapse the same way Google's did.** The port, the
  dormant Gemini adapter, and this ADR *are* the exit plan — the same swap in
  reverse, plus whatever Google's terms are that day.
- The Gemini client config (and the Spring AI 1.1.8 `enable-cached-content`
  pin documented in as-built Step 2b) stays as long as the return path does.
- ADR-001's warning stands sharpened: **free-tier terms are a product
  dependency that can change unilaterally and silently.** This release hit it
  twice (grounding paywalled, 2.5 models closed) within one build step.
