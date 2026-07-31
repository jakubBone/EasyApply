# Applikon — Spec-Driven Process

Specs before code. A release gets a folder, a feature gets a topic folder inside
it, and a topic gets only the files it needs.

## The four documents

| File | Answers |
|------|---------|
| `brief.md` | Why this exists and what it does |
| `user-stories.md` | What the user can do, and what counts as done |
| `implementation-plan.md` | How it gets built, step by step |
| `as-built.md` | What actually shipped, and where it differs from the plan |

The first three live inside a topic folder. `as-built.md` sits one level up, in
the release folder — one per release, covering every topic in it.

Two references live once at the `spec/` root and are updated whenever a release
changes them:

- `architecture.md` — packages, endpoints, database schema, frontend components
- `security.md` — login flow, tokens, filter chain

ADRs live at `spec/adr/`, numbered `ADR-NNN-*.md`. One is written when a
decision was genuinely contested: real alternatives, consequences that outlive
the release. A conventional choice does not get an ADR — its reason belongs in
the brief or in `as-built.md`. ADRs start at release 2.1.0; see
`spec/adr/README.md`.

## Numbering

An **era** is a top-level `vN/` folder. It is created only for a SemVer major
bump — a genuinely new architectural decision.

A **release** is a folder named after the version it ships (`v2/2.1.0/`), so a
spec path and a CHANGELOG entry are always the same number.

A **topic** is one feature (`07-privacy-rodo/`, `03-company-brief/`). Topic
numbers run continuously across the whole era, crossing release boundaries
(`1.0.0/14-rebrand-applikon/` → `1.1.0/15-landing-page/`). A new era restarts at
`01`.

A **step** is a unit of work inside `implementation-plan.md`, numbered from 1 in
each plan. Reference one as "`03-company-brief`, Step 2". The word "phase" is
not used — it used to mean both the folder and the step.

## Rules

**Plain language.** One idea per sentence. In prose, at most one dash per
paragraph — a dash separating a term from its description in a list or heading
is fine, because it scans. Expand jargon the first time it appears.
`CHANGELOG.md` is the tone to match: a junior developer reading English as a
second language should get through it without stopping.

**No process ceremony inside documents.** The working rhythm is written here,
once. A brief or a plan does not restate it.

**Every step keeps its checklist**, in every release, shipped or not. A ticked
list is the record that the step actually passed, and it is what makes a plan
verifiable later — by me and by an assistant reading it.

**No open box survives a release.** When the release ships, every remaining
`[ ]` is resolved: tick it, or move it to `as-built.md` under "Not done" and
take it off the list. An unchecked box in a shipped release means the document
is lying about its own state.

The one exception is a plan that was **never executed** — work specified, then
deferred. It keeps its open checklist, because that is the truth, and it says
so in a note at the top pointing at the `as-built.md` row that records the
deferral.

**Links only when they answer a question the reader will have.** Allowed:
`as-built.md` → `architecture.md` ("what exists now"), `as-built.md` or a plan →
an ADR ("why this changed"), an ADR → the ADR it supersedes. Not allowed: links
to sibling files in the same folder, "this topic follows topic N", or a
"Related documents" list.

**No dates in headers.** Git has them. A date stays only when it is evidence —
"verified against the live API on 2026-07-16".

**Shipped specs keep their decisions.** Reality that disagrees with a shipped
plan goes into `as-built.md`, or becomes the next topic folder. It is never
edited back into the plan. Reformatting a document for readability is not a
retcon and is always allowed.

## Working rhythm

A step is done when:

1. Its tests are green — frontend verified in-session, backend `./mvnw test` on
   the dev machine (no JDK in-session).
2. Every new UI string exists in both PL and EN.
3. Its checklist is ticked.
4. `as-built.md` records anything that differs from the plan.

A release ends with a working deploy, an updated `as-built.md`, a CHANGELOG
entry, and version bumps. Commits are Conventional Commits with the scopes
`backend`, `frontend`, `spec`, `db`, `infra`.

## Templates

Use these headings in this order. A section with nothing honest to say is left
out rather than filled with padding. The orientation section at the top of a
plan may be renamed when the topic is mostly reuse rather than new files, for
example "What this builds on".

**Top-level sections are numbered**, so any part of a document can be cited
precisely: "brief §3", "US-2.1", "`03-company-brief`, Step 2". Numbers are
positional — if a section is left out, the ones after it move up.

Two document types number differently, for a reason:

- The **plan** numbers by `Step N`, and the orientation sections before Step 1
  carry no number.
- An **ADR** leaves its sections unnumbered, because `§N` there already means a
  numbered clause inside `## Decision` — "ADR-001 §5" is the quota-discipline
  clause, not the fifth section.

### `brief.md`

```markdown
# 2.1.0 — Company Brief

## 1. Problem
What hurts, and for whom. Two or three short paragraphs.

## 2. Solution
What this topic does. Bullets.

## 3. Out of scope
What it deliberately does not do, and why. Bullets.

## 4. Done when
- A checkable outcome
- Another one
- Three to five in total
```

### `user-stories.md`

```markdown
# 2.1.0 — User Stories

## 1. Marking a question

**US-1.1** — As a candidate, I want to ..., so that ...

**Acceptance criteria**
- ...

**Edge cases**
- ...

## 2. ...
```

### `implementation-plan.md`

```markdown
# 2.1.0 03-company-brief — Implementation Plan

## What changes
**Backend:** files created and changed.
**Frontend:** files created and changed.

## Step 1 — Backend: the attribute

**Build**
- ...

**Tests**
- ...

**Done when**
- ...

**Checklist**
- [ ] ...

## Step 2 — ...
```

### `as-built.md`

```markdown
# 2.1.0 — As-Built

Source of truth is the code. What exists now: [architecture.md](../../architecture.md).

## 1. What shipped
How the feature works today, in plain language. Five to twelve lines. A reader
who never saw the plan should understand the finished release from this section
alone.

## 2. Changed from plan
| Where | Planned | Built | Why |
|-------|---------|-------|-----|
| ... | ... | ... | ... |

## 3. Not done
| Item | Why not |
|------|---------|
| ... | ... |
```

### ADR

```markdown
# ADR-005 — Groq compound replaces Gemini as the brief provider

**Status:** Accepted · supersedes ADR-001 §1-2

## Context
What forced a choice.

## Decision
What was chosen.

## Alternatives rejected
- **Option** — why not.

## Consequences
What this costs, and what to watch out for.
```
