# ADR-005 — Groq compound replaces Gemini grounding as the brief provider

**Status:** Accepted · supersedes ADR-001 §1-2; every other ADR-001 clause stands

## Context

Step 2b shipped the Gemini adapter exactly as planned, and it never produced a
single brief. Verified on 2026-07-16 against the live APIs and Google's own docs:

- Every grounded request returned **429 quota exceeded**, despite almost no
  usage. Grounded generation draws on a **separate quota pool** from plain
  generation, and on the free tier that pool is empty.
- Google's pricing page lists grounding with Google Search as **not available**
  on the free tier for the whole Gemini 3.x family. Billing for it began on
  2026-01-05. The paid tier includes 5,000 grounded prompts a month at no charge,
  but it requires a card on file.
- The only models that still have free-tier grounding, 2.5-flash and
  2.5-flash-lite at 500 requests a day, return **404, no longer available to new
  users**. Verified live with this project's key.

Two of ADR-001's constraints, **cost zero** and **grounded, never invented**,
became impossible to satisfy together on Gemini for a new project.

ADR-001 §6 named Groq as the fallback if Gemini's free-tier terms collapsed. They
did. ADR-001 also assumed Groq had no built-in search grounding, and that is no
longer true: Groq's **compound** systems run web search on the server side, which
is exactly the capability gap that originally disqualified it.

## Decision

1. **Provider: Groq `groq/compound-mini`**, through Groq's OpenAI-compatible API
   and Spring AI's OpenAI starter. Still only the `ChatModel` abstraction, with
   no provider SDK in application code. Web search runs server side, one tool
   call per request, and a brief needs exactly one.
2. **Both adapters stay behind the `BriefChatModel` port**, selected by the
   `brief.provider` property, with `groq` active and `gemini` kept.
   `spring.ai.model.chat` flips with it, so exactly one chat auto-configuration
   is ever active. Switching back is configuration, not code.
3. **The prompt and the parsing are duplicated across the two adapters on
   purpose.** Two similar files beat a premature shared abstraction while one
   adapter is dormant. Consolidating is worth it only if a third provider
   appears.
4. **ADR-001's remaining clauses carry over unchanged**: minimal egress into the
   prompt, one structured call covering every field and locale with per-field
   insufficient markers and no partial briefs, brief content stays display-only
   because searched web content is still untrusted input, and separate dev and
   prod keys — now `GROQ_API_KEY`.

## Alternatives rejected

- **Gemini paid Tier 1.** It includes 5,000 grounded prompts a month free, then
  charges $14 per thousand. Rejected because it requires a card on file, which
  breaks the cost-zero constraint even if the realistic monthly bill rounds to
  nothing.
- **Gemini free tier without grounding.** Breaks "grounded, never invented".
  Briefs written from model memory hallucinate or go stale for exactly the small
  companies this feature exists to cover.
- **Gemini's `url_context` tool**, which is free on the free tier. The model can
  read the job-ad page but cannot research the company, so it is partial
  grounding at best. Spring AI 1.1.8 also does not expose the tool, which would
  mean dropping to the raw SDK. Worth noting as a possible future complement, not
  as a replacement.
- **Our own search pipeline**, for example a Brave or Tavily free tier plus any
  LLM. That is a second external service, key and quota to manage, in order to
  rebuild what compound ships built in.
- **xAI Grok Live Search.** Its $25 of starter credit expires after 30 days, so
  it is not durably free.

## Consequences

- **Grounding quality now depends on Groq's server-side search.** The citation
  metadata differs from Gemini's, but the brief pipeline never surfaced
  citations, so nothing changes for the user.
- **Two chat starters sit on the classpath with exactly one active.**
  `brief.provider` and `spring.ai.model.chat` have to move together, and the
  properties file documents that pairing.
- **Groq's free tier can collapse the same way Google's did.** The port, the
  dormant Gemini adapter and this ADR are the exit plan: the same swap in
  reverse, plus whatever Google's terms happen to be that day.
- The Gemini client config, including the Spring AI 1.1.8 `enable-cached-content`
  pin, stays as long as the return path does.
- ADR-001's warning stands, sharpened: **free-tier terms are a product dependency
  that can change unilaterally and without notice.** This release hit that twice
  within a single build step — grounding put behind a paywall, and the 2.5 models
  closed to new users.
