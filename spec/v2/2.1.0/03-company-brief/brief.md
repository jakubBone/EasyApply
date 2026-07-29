# 2.1.0 — Company Brief

## 1. Problem

Release 2.0.0 gave every application an "About the company" section, but the
candidate still fills it in by hand. In practice that means googling the company
after applying, and most users never do it. The recruiter calls, the section is
empty, and *"what do you know about us?"* still lands on an unprepared candidate.

The research itself is mechanical: what the company does, who its customers are,
what stack it uses, how big it is. That is exactly the kind of first-pass work an
LLM with web search does well. It is a **starting point** the candidate verifies
and builds on, not a replacement for their own answer.

This release adds exactly one feature and changes nothing else.

## 2. Solution

A **company brief, generated on demand** for an application.

- Generated on demand, with one button click. Never automatically.
- **Four structured fields**, not freeform prose:
  1. industry, meaning what the company does,
  2. product and customers, B2B or B2C,
  3. tech stack,
  4. size and stage.
- Shown in the application's cheat sheet.

The user decides when: typically right after applying, or before a scheduled
call. On demand also means the free AI quota is spent only on briefs someone
actually asked for.

## 3. Out of scope

- **Any other AI feature.** The company brief is the whole AI surface of this
  release.
- **Automatic generation.** Nothing fires without the user's click.
- **AI-driven actions.** The model output is displayed, never executed.
- **New module structure, event system, or infrastructure.** One background call
  inside the existing monolith.
- **A paid tier.** Free tier only.

## 4. Done when

- One click on an application produces a company brief with the four fields,
  visible in that application's cheat sheet.
- Nothing else in the app is slowed down, blocked, or broken by generation.
