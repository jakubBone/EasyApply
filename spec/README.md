# Applikon — `spec/`

Specifications for Applikon, written spec-first: the spec comes before the code.

The user throughout is the same person — a Polish IT candidate, junior or mid,
applying to 10-20 jobs a month through job boards. The full picture is in
[`v1/1.0.0/01-vision/brief.md`](v1/1.0.0/01-vision/brief.md).

How specs are written, numbered and closed: [`PROCESS.md`](PROCESS.md). It also
carries the template for every document type.

## Where to look

| Question | File |
|----------|------|
| What does the app look like inside? | [`architecture.md`](architecture.md) |
| How does login and authorization work? | [`security.md`](security.md) |
| Why was something built this way? | [`adr/`](adr/) |
| What did release X.Y.0 actually ship? | `vN/X.Y.0/as-built.md` |
| Why does a feature exist? | `vN/X.Y.0/NN-topic/brief.md` |
| How do I deploy? | [`deployment/`](deployment/) |

## Structure

```
spec/
├── PROCESS.md          the house process + document templates
├── architecture.md     living: packages, endpoints, DB schema, FE components
├── security.md         living: auth flow, tokens, filter chain
├── adr/                architecture decision records
├── deployment/         production deployment guides (Hetzner)
├── v1/                 MVP era
│   ├── 1.0.0/
│   │   ├── 01-vision/               MVP scope
│   │   ├── 02-mvp-implementation/   build plan
│   │   ├── 03-mvp-review/           code review
│   │   ├── 04-mvp-refactoring/      refactor + learning
│   │   ├── 05-additional-features/  i18n, logout
│   │   ├── 06-cleanup/              stage-history removal
│   │   ├── 07-privacy-rodo/         consent, account deletion, CV link-only
│   │   ├── 08-user-data/            data export, service notices
│   │   ├── 09-security-review/      OWASP audit, token hardening
│   │   ├── 10-logging/              WARN on failure paths
│   │   ├── 11-swagger/              API docs
│   │   ├── 12-ci/                   GitHub Actions
│   │   ├── 13-docker-registry/      GHCR images
│   │   ├── 14-rebrand-applikon/     EasyApply → Applikon
│   │   └── as-built.md
│   └── 1.1.0/
│       ├── 15-landing-page/         public landing
│       └── as-built.md
└── v2/                 Screening Companion era
    ├── 2.0.0/
    │   ├── 01-screening-companion/       cheat sheet, board cleanup
    │   ├── 02-cheat-sheet-consolidation/ post-dogfooding UX, per-app questions
    │   └── as-built.md
    ├── 2.1.0/
    │   ├── 03-company-brief/             on-demand AI company brief
    │   └── as-built.md
    └── 2.2.0/
        ├── 04-question-kind/             screening vs technical questions
        └── as-built.md
```

ALL-CAPS filenames are entry points; lowercase files are content.

## A note on v1 topics 01-06

Those folders are the first, organic pass, written while I was learning
spec-driven development. They do not follow the templates in `PROCESS.md`,
because the templates came out of that experience. They are kept as they were
written.

The `learning/` folders inside them are something else again: a personal
learning journal from mentor-mode refactoring sessions, not specification. The
process itself starts at `07-privacy-rodo` and settles in v2.
