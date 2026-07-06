# Applikon — Spec-Driven Process

## 🧭 Specs before code
Each version uses only the files it needs — skip the rest and say why in
`brief.md`. Process distilled from building v1; v1's own history is in
`v1/as-built.md`.

## 📄 The files

| File | What's in it |
|------|--------------|
| `brief.md` | idea · who it's for · **in/out of scope** |
| `user-stories.md` | user stories · edge cases · acceptance criteria |
| `plan.md` | phases · tests · progress tracking · Definition of Done |
| `as-built.md` | what actually got built vs planned — no number, living, updated continuously |

`architecture.md` lives once at `spec/architecture.md`, not per version — a living
cross-version reference, written only when a version adds something new to design.

## 📂 Numbering

Every phase is a numbered **folder** (`01-brief/`, `02-user-stories/`, …), not a
bare numbered file — folders and files sort separately in most file browsers. If
reality disagrees with a shipped phase, that becomes the **next** numbered folder —
never a retroactive edit to an earlier `brief.md`/`plan.md`. The gap goes in
`as-built.md`. I drive this chain with my own `spec-assistant` skill.

## 🏁 Each version ends with

Working deploy · updated `as-built.md`. Conventional commits, scopes as in v1
(`backend`, `frontend`, `spec`, `db`, `infra`).

## 🔢 Spec version vs app version

`spec/vN` numbers **planning phases**, not releases. The app's own version
(`CHANGELOG.md`, `package.json`, `pom.xml`, the README badge) is a separate axis:
v1 (the MVP) shipped two releases (`1.0.0`, `1.1.0`) before any versioning rule was
stated. `2.0.0` (start of spec-v2) marks the end of that ad-hoc MVP phase — from
here on the app follows standard SemVer (`feat` → minor, `fix` → patch, breaking →
major) via Conventional Commits, independently of which `spec/vN` is being worked
on. A given spec version can span zero, one, or several app releases.
