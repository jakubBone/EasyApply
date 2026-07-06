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

A **phase is a topic or feature**, never an artifact type — `brief.md`,
`user-stories.md`, `plan.md` are files *inside* one phase folder, never separate
numbered folders of their own (e.g. `07-privacy-rodo/` holds its own `brief.md` +
whatever else it needs; there is no separate `08-privacy-rodo-plan/`). A phase
folder is a numbered **folder** (`07-privacy-rodo/`, `14-rebrand-applikon/`, …),
not a bare numbered file — folders and files sort separately in most file
browsers — and holds only the files it actually needs (§"The files"): a single
`brief.md` if that's all a phase needs, several files or subfolders if it needs
more.

Phase numbers are **continuous across an entire era**, not reset per release —
they cross release (`X.Y.Z/`) boundaries the same way v1's phase 14
(`1.0.0/14-rebrand-applikon/`) is followed by phase 15
(`1.1.0/15-landing-page/`). A new architectural era (new top-level `vN`, see
below) restarts the counter at 01.

If reality disagrees with a shipped phase, that becomes the **next** numbered
phase — never a retroactive edit to an earlier `brief.md`/`plan.md`. The gap goes
in `as-built.md`. I drive this chain with my own `spec-assistant` skill.

## 🏁 Each version ends with

Working deploy · updated `as-built.md`. Conventional commits, scopes as in v1
(`backend`, `frontend`, `spec`, `db`, `infra`).

## 🔢 Spec version vs app version

The app's own version (`CHANGELOG.md`, `package.json`, `pom.xml`, the README badge)
follows standard SemVer (`feat` → minor, `fix` → patch, breaking → major) via
Conventional Commits. v1 (the MVP) shipped two releases (`1.0.0`, `1.1.0`) before
any versioning rule was stated; `2.0.0` marks the end of that ad-hoc phase and the
start of the rule below.

`spec/vN` numbers **architectural eras**, not every release — a new top-level `vN`
folder is created only for a release that earns a deliberate SemVer **major** bump
(a genuinely new architectural decision: e.g. introducing Spring Modulith, or
extracting a worker over Kafka), not for every `feat` commit. Incremental releases
*within* an era (new features, no new architecture) don't get a new `vN` — they get
a subfolder named after the exact app version they ship: `v2/2.0.0/`, `v2/2.1.0/`,
`v2/2.2.0/`, … So a spec path and a CHANGELOG entry are always the same number —
`spec/v3/` reader-facing work always corresponds to app version `3.0.0`, no
translation needed. `as-built.md` lives once per era (`v2/as-built.md`), not per
release, since it tracks the whole era continuously.

Deciding "new era vs. new release-in-era": ask whether the feature needs a genuinely
new architectural decision to support it (module boundaries, an outbox, a new
deployable, a new event scheme). If yes → new `vN` era, major bump. If no (it's
composable on what already exists) → next `X.Y.0` release folder inside the current
era's `vN`.
