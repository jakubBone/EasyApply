# Applikon — `spec/`

Specifications for Applikon, written **spec-first** (specs before code).

## 🔄 Workflow
- v1 — the first, organic pass where I learned spec-driven development hands-on.
- From v2 — a leaner, repeatable process, documented in `PROCESS.md`.

## 📐 Conventions

Details in `PROCESS.md`; the short version:

- **Era** = top-level `vN/`, only for a SemVer-major architectural change.
  Releases inside it are `vN/X.Y.0/` — spec path = CHANGELOG entry.
- **Topic folder** = one feature (`07-privacy-rodo/`), numbered continuously
  across the era; holds only the files it needs (`brief.md`, `user-stories.md`,
  `implementation-plan.md`).
- **Steps** (`Step 1..N`) live inside `implementation-plan.md`, reset per plan; reference as
  "`03-company-brief`, Step 2".
- Shipped specs are never edited retroactively — new decisions become the next
  topic folder; plan-vs-built differences go to the release's `as-built.md`.
- `architecture.md` is one living cross-version file at `spec/` root.
- ALL-CAPS filenames = entry points (`README.md`, `PROCESS.md`); lowercase =
  content artifacts.

## 🗂️ Structure

```
spec/
├── PROCESS.md          ← the house process
├── architecture.md     ← living: packages, endpoints, DB schema, FE components
├── adr/                ← architecture decision records
├── deployment/         ← production deployment guides (Hetzner)
├── v1/                 ← MVP era
│   ├── 1.0.0/
│   │   ├── 01-vision/               ← MVP scope
│   │   ├── 02-mvp-implementation/   ← build plan
│   │   ├── 03-mvp-review/           ← code review
│   │   ├── 04-mvp-refactoring/      ← refactor + learning
│   │   ├── 05-additional-features/  ← i18n, logout
│   │   ├── 06-cleanup/              ← stage-history removal
│   │   ├── 07-privacy-rodo/         ← consent, account deletion, CV link-only
│   │   ├── 08-user-data/            ← data export, service notices
│   │   ├── 09-security-review/      ← OWASP audit, token hardening
│   │   ├── 10-logging/              ← WARN on failure paths
│   │   ├── 11-swagger/              ← API docs
│   │   ├── 12-ci/                   ← GitHub Actions
│   │   ├── 13-docker-registry/      ← GHCR images
│   │   ├── 14-rebrand-applikon/     ← EasyApply → Applikon
│   │   └── as-built.md
│   ├── 1.1.0/
│   │   ├── 15-landing-page/         ← public landing
│   │   └── as-built.md
│   └── security.md     ← auth flow, tokens, filter chain
└── v2/                 ← Screening Companion era
    ├── 2.0.0/
    │   ├── 01-screening-companion/       ← cheat sheet, board cleanup
    │   ├── 02-cheat-sheet-consolidation/ ← post-dogfooding UX, per-app questions
    │   └── as-built.md
    ├── 2.1.0/
    │   ├── 03-company-brief/            ← on-demand AI company brief
    │   └── as-built.md
    └── 2.2.0/
        ├── 04-question-kind/           ← screening vs technical questions
        └── as-built.md
```
