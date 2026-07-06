# Applikon — `spec/`

Specifications for Applikon, written **spec-first** (specs before code).

## 🔄 Workflow
- v1 — the first, organic pass where I learned spec-driven development hands-on.
- From v2 — a leaner, repeatable process, documented in `PROCESS.md`.

## 📐 Conventions

- Each version **era** is its own folder (`v1/`, `v2/`, …), following `PROCESS.md`.
  A new top-level `vN` is reserved for a genuinely new architectural era — matched
  to a deliberate SemVer **major** bump (see `PROCESS.md` §"Spec version vs app
  version"). Incremental releases within the current era live one level deeper, in
  a folder named after the exact app version they ship (`v2/2.0.0/`, `v2/2.1.0/`, …)
  — no translation needed between a spec path and a CHANGELOG entry.
- A **phase is a topic or feature** (`07-privacy-rodo/`, `14-rebrand-applikon/`),
  never an artifact type — `brief.md`/`user-stories.md`/`plan.md` are files
  *inside* one phase folder, not separate numbered folders. Every phase —
  including the first one — is its own **numbered folder**, not a bare numbered
  file: folders and files sort separately in most file browsers, so a lone
  numbered file among numbered folders won't land in sequence. A phase folder
  holds only the files it needs — one, or several.
- Phase numbers are **continuous across the whole era**, crossing release
  (`X.Y.Z/`) boundaries (v1's phase 14 in `1.0.0/` is followed by phase 15 in
  `1.1.0/`). A new era restarts the counter at 01.
- If a version needs a genuinely new round of decisions after its initial phases
  ship, that becomes the **next** numbered phase folder — never a retroactive edit
  to an earlier phase's `brief.md`/`plan.md`.
- `as-built.md` carries no number and lives at the **era** level (`v2/as-built.md`,
  not inside a specific `2.x.0/` release folder): it's a living, continuously-updated
  document covering every phase and every release in that era (same role as
  `v1/as-built.md`).
- File naming: **ALL-CAPS** for repo-wide entry points (`README.md`, `CLAUDE.md`,
  `PROCESS.md`) — files meant to be found first. **lowercase** for content artifacts
  (`brief.md`, `plan.md`, `architecture.md`, `as-built.md`, `security.md`,
  `user-stories.md`) — files you're pointed to, not looking for.
- `architecture.md` lives at `spec/` root, not inside `v1/`: it's a living,
  cross-version reference (schema/endpoints/components), not v1-specific — v2 adds
  its own sections here rather than getting a separate file (see `PROCESS.md`).

## 🗂️ Structure

```
spec/
├── PROCESS.md                   ← how specs are written here (the house process)
├── architecture.md              ← LIVING, cross-version: package structure, REST endpoints, DB schema, FE (v1 + v2 sections)
├── v1/                          ← the MVP era, built in numbered phases
│   ├── 1.0.0/                    ← first release of the era — shipped (phases 1-14)
│   │   ├── 01-vision/            ← MVP scope
│   │   ├── 02-mvp-implementation/ ← MVP implementation plan
│   │   ├── 03-mvp-review/        ← MVP code review
│   │   ├── 04-mvp-refactoring/   ← refactoring & learning (Claude as mentor)
│   │   ├── 05-additional-features/ ← i18n, onboarding, gamification
│   │   ├── 06-cleanup/           ← technical cleanup
│   │   ├── 07-privacy-rodo/      ← RODO & privacy policy
│   │   ├── 08-user-data/         ← account management
│   │   ├── 09-security-review/   ← OWASP audit, timing-attack fix, HMAC-SHA256 tokens
│   │   ├── 10-logging/           ← production observability
│   │   ├── 11-swagger/           ← API documentation
│   │   ├── 12-ci/                ← GitHub Actions CI
│   │   ├── 13-docker-registry/   ← Docker & GHCR
│   │   └── 14-rebrand-applikon/  ← rebrand EasyApply → Applikon
│   ├── 1.1.0/                    ← second release of the era — shipped
│   │   └── 15-landing-page/      ← public landing page
│   ├── as-built.md              ← plan vs reality, deviations, phase history (whole era)
│   └── security.md              ← security rules, auth flow
├── v2/                          ← Screening Companion era (planning + build)
│   ├── 2.0.0/                    ← first release of the era — shipped
│   │   ├── 01-screening-companion/  ← Phases 1-4: cheat sheet + board cleanup, no AI
│   │   │   ├── brief.md          ← original requirements (in/out of scope)
│   │   │   ├── user-stories.md   ← stories, edge cases, acceptance criteria
│   │   │   └── plan.md           ← Phases 1-4, tests, checklists, DoD
│   │   └── 02-cheat-sheet-consolidation/  ← Phases 5-6: post-dogfooding UX + data-model revision
│   │       ├── brief.md          ← what Phase 01 got wrong and why this phase exists
│   │       └── plan.md           ← Phases 5-6 build steps, tests, DoD
│   │                              (2.1.0/ starts at phase 03, continuing the era's counter,
│   │                               created only when that release starts)
│   └── as-built.md              ← what actually got built (living, unnumbered, whole era)
└── deployment/                  ← production deployment guides (Hetzner)
```
