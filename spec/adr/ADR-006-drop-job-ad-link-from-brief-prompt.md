# ADR-006 — The job-ad link leaves the brief prompt

> **Status:** Accepted (2026-07-21) · **Scope:** release 2.1.0 (company brief) ·
> Supersedes the **job-ad-link half** of
> [US-1.1](../v2/2.1.0/03-company-brief/user-stories.md), of
> [ADR-001](ADR-001-gemini-free-tier-grounding.md) §4's egress list, and of the
> same clause carried forward in
> [ADR-005](ADR-005-groq-compound-brief-provider.md) §4. Every other clause in
> those ADRs — provider abstraction, one structured call, display-only trust
> boundary, no partial briefs, quota discipline — stands unchanged.

## Context

The brief prompt was specified to carry the company name **and** the job-ad link,
the link described as "a priority hint, not a hard restriction". Manual
verification in Step 3 showed the hint does nothing:

- An application for **EPAM** carrying a link to a **Samsung** job ad produced a
  brief about EPAM, with no trace of Samsung. The company name is the prompt's
  subject; the model researches that name and treats the URL as decoration.
- The cache key makes it structurally inert anyway. A brief is stored per
  `(user, company)` and served to every application to that company, whichever
  link happened to trigger generation. A per-application input cannot steer a
  per-company cached result without breaking that key.

The link is not free, though:

- **Data egress.** It is user-pasted text leaving the system on every generation.
  Job-ad URLs routinely carry tracking and referral parameters, and a link can
  identify a specific recruiter or an internal posting. ADR-001 §4 minimised
  egress to what the feature needs; an input with no effect on the output no
  longer qualifies.
- **Injection surface.** A URL in the prompt invites the provider's server-side
  search to fetch and act on a page nobody vetted — widening the untrusted-input
  boundary ADR-001 §4 draws, for no gain.

## Decision

1. **Only the company name enters the prompt.** Egress for this feature is now
   exactly one field, typed by the user as a company name.
2. **The port drops the parameter:** `BriefChatModel.generate(String companyName)`.
   Both adapters, the fake, and `BriefGenerationRequested` follow.
3. **Generating against a specific offer is a separate feature, not a flag.** An
   offer-aware brief (project, stack, duties) is per application, while this
   brief is cached per company — a different object needing a different key, a
   different lifetime, and its own egress justification. Out of scope here; if
   it is ever built, it starts as its own topic rather than a parameter added
   back to this one.

## Alternatives considered

- **Keep the link, sanitise it** (strip query parameters, allowlist hosts) —
  rejected: code and upkeep to preserve an input with no demonstrated effect on
  the output.
- **Keep it and make it count**, e.g. instruct the model to read the page first —
  rejected here: that is the per-offer feature above, and it needs its own cache
  key before it can be correct.
- **Make it opt-in per generation** — rejected: a switch for a hint that changed
  no output in testing asks the user to decide something nobody can decide
  informed.

## Consequences

- Brief quality is unchanged — established by verification before removal, not
  assumed after it.
- The adapter tests assert the link is **absent** from the prompt, so the
  reduction is enforced by the suite rather than described in prose.
- US-1.1's acceptance criteria mentioning the link no longer hold as written.
  This ADR is the record; the user story is not edited after the fact.
- `Application.link` keeps its other jobs (the user opens it, the GDPR export
  includes it). Only the AI path stops reading it.
- If per-offer generation ever ships, it starts from a clean baseline: one field
  today, plus whatever that feature can explicitly justify then.
