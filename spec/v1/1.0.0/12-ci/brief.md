# Applikon — Phase 12: GitHub Actions CI

## 1. Context

The application is feature-complete and being prepared for public deployment.
There is no automated check verifying that pushed code doesn't break tests.

---

## 2. Problem

- Pushing broken code to `main` goes undetected until someone runs tests locally.
- Without CI, the workflow documented in `spec/post/pre-deploy-checklist.md`
  relies entirely on developer discipline.

---

## 3. Decision

Add a single GitHub Actions workflow file (`.github/workflows/ci.yml`) that:

- Triggers on every push to `master`
- Runs backend tests: Java 21, `./mvnw test`
- Runs frontend build + unit tests: Node 22, `npm ci && npm run test:run && npm run build`
- Both jobs run in parallel (no dependency between them)
- Adds a CI status badge to `README.md`

**What we do NOT add:**

- Continuous Deployment to Hetzner — deploy stays a deliberate manual step (SSH + `docker-compose up`)
- Docker image build in CI — no registry configured
- Dependabot / CodeQL — overkill for a solo portfolio project
- Separate workflows for branches other than `main`

---

## 4. Scope

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | New — CI pipeline |
| `README.md` | Add CI badge at the top |

No backend or frontend source code changes.

---

## 5. Out of Scope

- CD pipeline (auto-deploy to Hetzner)
- Docker image build or push to any registry
- Dependabot, CodeQL, or other GitHub security features
- Coverage reports or artifact uploads

---

## 6. Success Criteria (Definition of Done)

Phase 12 is closed when:

1. ✅ Push to `main` triggers the workflow on GitHub Actions
2. ✅ Backend job: `./mvnw test` passes on GitHub-hosted runner (Java 21)
3. ✅ Frontend job: `npm run test:run && npm run build` passes (Node 22)
4. ✅ CI badge in `README.md` shows green
5. ✅ `spec/README.md` updated with phase 12 row

---

## 7. Implementation Order

Single step — create `.github/workflows/ci.yml` and add badge to `README.md`.
No code phases; the workflow file is the entire implementation.

---

## 8. Related Documents

- `spec/v1/as-built.md` — update after completion
- `spec/v1/1.0.0/12-ci/implementation-plan.md` — workflow file content + badge syntax
- `spec/post/pre-deploy-checklist.md` — broader GitHub publication checklist
- `spec/README.md` — add row for phase 12

---

*Created: 2026-05-06*
