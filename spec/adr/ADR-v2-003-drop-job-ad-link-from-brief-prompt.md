# ADR-v2-003 — The job-ad link leaves the brief prompt

## Context

The brief prompt was specified to carry the company name **and** the job-ad link,
with the link described as a priority hint rather than a hard restriction. Manual
verification in Step 3 showed the hint does nothing.

An application for **EPAM** carrying a link to a **Samsung** job ad produced a
brief about EPAM, with no trace of Samsung. The company name is the subject of
the prompt: the model researches that name and treats the URL as decoration.

The cache key makes the link structurally inert anyway. A brief is stored per
user and company, and served to every application to that company, whichever link
happened to trigger the generation. A per-application input cannot steer a
per-company cached result without breaking that key.

The link is not free, though.

**It is data egress.** User-pasted text leaves the system on every generation.
Job-ad URLs routinely carry tracking and referral parameters, and a link can
identify a specific recruiter or an internal posting. Egress stays at what the
feature actually needs, and an input with no effect on the output no longer
qualifies.

**It widens the injection surface.** A URL in the prompt invites the provider's
server-side search to fetch and act on a page nobody vetted, which stretches the
untrusted-input boundary for no gain.

## Decision

1. **Only the company name enters the prompt.** Egress for this feature is now
   exactly one field, typed by the user as a company name.
2. **The port drops the parameter**, becoming
   `BriefChatModel.generate(String companyName)`. Both adapters, the fake and
   `BriefGenerationRequested` follow.
3. **Generating against a specific offer is a separate feature, not a flag.** An
   offer-aware brief covering the project, stack and duties is per application,
   while this brief is cached per company. That is a different object needing a
   different key, a different lifetime and its own egress justification. It is
   out of scope here, and if it is ever built it starts as its own topic rather
   than as a parameter added back to this one.

## Alternatives rejected

- **Keep the link but sanitise it**, stripping query parameters and allowlisting
  hosts. That is code and upkeep to preserve an input with no demonstrated effect
  on the output.
- **Keep it and make it count**, for example by instructing the model to read the
  page first. That is the per-offer feature above, and it needs its own cache key
  before it can even be correct.
- **Make it opt-in per generation.** A switch for a hint that changed no output
  in testing asks the user to decide something nobody can decide informed.

## Consequences

- Brief quality is unchanged. That was established by verification before the
  removal, not assumed after it.
- The adapter tests assert the link is **absent** from the prompt, so the
  reduction is enforced by the suite rather than described in prose.
- US-1.1's acceptance criteria mentioning the link no longer hold as written.
  This ADR is the record; the user story is not edited after the fact.
- `Application.link` keeps its other jobs. The user still opens it and the GDPR
  export still includes it. Only the AI path stops reading it.
- If per-offer generation ever ships, it starts from a clean baseline: one field
  today, plus whatever that feature can explicitly justify then.
