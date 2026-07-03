# Applikon — `spec/`

Specifications for Applikon, written **spec-first** (specs before code).

## 🔄 Workflow
- v1 — the first, organic pass where I learned spec-driven development hands-on.
- From v2 — a leaner, repeatable process, documented in `PROCESS.md`.

## 📐 Conventions

- Each version is its own folder (`v1/`, `v2/`, …), following `PROCESS.md`.
- Every phase — including the first one — is its own **numbered folder**
  (`01-brief/`, `02-user-stories/`, …), not a bare numbered file: folders and files
  sort separately in most file browsers, so a lone numbered file among numbered
  folders won't land in sequence. Each folder holds generically-named files
  (`brief.md`, `plan.md`, …).
- If a version needs a genuinely new round of decisions after its initial phases
  ship, that becomes the **next** numbered phase folder — never a retroactive edit
  to an earlier phase's `brief.md`/`plan.md`.
- `as-built.md` carries no number: it's a living, continuously-updated document
  covering every phase, not a one-time step in the chain (same role as `v1/as-built.md`).
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
├── v1/                          ← the MVP, built in numbered phases
│   ├── 01-vision/               ← MVP scope
│   ├── 02-implementation/       ← MVP implementation plan
│   ├── 03-review/               ← MVP code review
│   ├── 04-mvp-refactoring/      ← refactoring & learning (Claude as mentor)
│   ├── 05-additional-features/  ← i18n, onboarding, gamification
│   ├── 06-cleanup/              ← technical cleanup
│   ├── 07-privacy-rodo/         ← RODO & privacy policy
│   ├── 08-user-data/            ← account management
│   ├── 09-security-refactoring/ ← OWASP audit, timing-attack fix, HMAC-SHA256 tokens
│   ├── 10-logging/              ← production observability
│   ├── 11-swagger/              ← API documentation
│   ├── 12-ci/                   ← GitHub Actions CI
│   ├── 13-docker-registry/      ← Docker & GHCR
│   ├── 14-rebrand-applikon/     ← rebrand EasyApply → Applikon
│   ├── 15-landing-page/         ← public landing page
│   ├── as-built.md              ← plan vs reality, deviations, phase history (v1 only)
│   └── security.md              ← security rules, auth flow
├── v2/                          ← Screening Companion (planning + build)
│   ├── 01-brief/brief.md              ← original requirements (cheat sheet + board cleanup, no AI)
│   ├── 02-user-stories/user-stories.md ← original stories, edge cases, acceptance criteria
│   ├── 03-plan/plan.md                ← original plan — Phases 1-4, tests, checklists, DoD
│   ├── 04-cheat-sheet-consolidation/  ← Phases 5-6: post-dogfooding UX + data-model revision
│   │   ├── brief.md             ← what Phases 1-4 got wrong and why this phase exists
│   │   └── plan.md              ← Phases 5-6 build steps, tests, DoD
│   └── as-built.md              ← what actually got built (living, unnumbered, all phases)
└── deployment/                  ← production deployment guides (Hetzner)
```
