# 1.0.0 12-ci — Implementation Plan

## What changes

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | New — the CI pipeline |
| `README.md` | Add the CI badge below the title |

**Design decisions**

- **Parallel jobs.** Backend and frontend do not depend on each other, so running
  them in parallel keeps total CI time down.
- **`./mvnw test` only.** No `package`, no Docker build. The tests are the
  signal, not the artifact.
- **`npm ci`.** A reproducible install from `package-lock.json`, and faster than
  `npm install`.
- **`npm run test:run`.** A single Vitest pass, not watch mode.
- **`npm run build`.** Catches TypeScript errors the tests might miss.
- **No dependency caching.** It adds complexity, and CI speed is not critical for
  a portfolio project.

## Step 1 — The workflow file

**Build** — create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [master]

jobs:
  backend:
    name: Backend — Maven tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: temurin

      - name: Run tests
        working-directory: applikon-backend
        run: ./mvnw test

  frontend:
    name: Frontend — Vitest + build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        working-directory: applikon-frontend
        run: npm ci

      - name: Run unit tests
        working-directory: applikon-frontend
        run: npm run test:run

      - name: Build
        working-directory: applikon-frontend
        run: npm run build
```

## Step 2 — The badge

**Build** — add this to `README.md`, on the first line after the project title:

```markdown
[![CI](https://github.com/jakubBone/applikon/actions/workflows/ci.yml/badge.svg)](https://github.com/jakubBone/applikon/actions/workflows/ci.yml)
```

**Done when** a push triggers the workflow, both jobs finish green in the GitHub
Actions tab, and the badge renders green on github.com.

**Checklist**
- [x] `.github/workflows/ci.yml` exists and triggers on push
- [x] Backend job: `./mvnw test` passes on the GitHub runner
- [x] Frontend job: `npm run test:run && npm run build` pass on the GitHub runner
- [x] The CI badge is visible and green in `README.md`
