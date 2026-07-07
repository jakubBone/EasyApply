# Applikon — Spec-Driven Process

## 🧭 Specs before code
Each version uses only the files it needs — skip the rest and say why in
`brief.md`. Process distilled from building v1; v1's own history is in
`v1/1.0.0/as-built.md`.

## 📄 The files

| File | What's in it |
|------|--------------|
| `brief.md` | idea · who it's for · **in/out of scope** |
| `user-stories.md` | user stories · edge cases · acceptance criteria |
| `implementation-plan.md` | steps · tests · progress tracking · Definition of Done |
| `as-built.md` | plan-vs-built differences + short why — one per release folder, updated as steps ship |

`architecture.md` lives once at `spec/architecture.md`, not per version — a living
cross-version reference, written only when a version adds something new to design.

ADRs live once at `spec/adr/` (numbered `ADR-NNN-*.md`), written only when a
release makes a genuinely contested decision — real alternatives, long-lived
consequences. Conventional-default choices don't get one; their rationale stays
in topic briefs and `as-built.md`. First: ADR-001 (release 2.1.0).

## 📂 Numbering

An **era** is a top-level `vN/` folder, created only for a deliberate SemVer
**major** bump — a genuinely new architectural decision (module boundaries, a new
deployable, an event scheme). Releases inside an era are folders named after the
exact app version they ship (`v2/2.0.0/`, `v2/2.1.0/`, …), so a spec path and a
CHANGELOG entry are always the same number.

A **topic folder is one feature or topic**, never an artifact type — `brief.md`,
`user-stories.md`, `implementation-plan.md` are files *inside* one numbered topic folder
(`07-privacy-rodo/`, `14-rebrand-applikon/`), which holds only the files it
actually needs. Topic numbers are **continuous across the era**, crossing release
boundaries (`1.0.0/14-rebrand-applikon/` → `1.1.0/15-landing-page/`); a new era
restarts the counter at 01.

Inside an `implementation-plan.md`, work is broken into **steps** (`Step 1..N`), numbered from 1
within each plan. Cross-document references name the folder plus the step:
"`03-company-brief`, Step 2". (The word "phase" is deliberately not used — it
used to mean both the folder and the step.)

If reality disagrees with a shipped topic, that becomes the **next** numbered
folder — never a retroactive edit to an earlier `brief.md`/`implementation-plan.md`. The gap
goes in the release's `as-built.md`. I drive this chain with my own
`spec-assistant` skill.

## 🏁 Each version ends with

Working deploy · updated `as-built.md`. Conventional commits, scopes as in v1
(`backend`, `frontend`, `spec`, `db`, `infra`).
