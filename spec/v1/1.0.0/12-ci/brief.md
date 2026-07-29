# 1.0.0 — GitHub Actions CI

## 1. Problem

The application is feature-complete and being prepared for public deployment, but
nothing automatically verifies that pushed code still passes its tests.

Broken code on `main` goes unnoticed until somebody runs the tests locally, and
the pre-deploy routine depends entirely on developer discipline.

## 2. Solution

One GitHub Actions workflow, `.github/workflows/ci.yml`:

- triggers on every push to `main`,
- runs the backend tests on Java 21 with `./mvnw test`,
- runs the frontend on Node 22 with `npm ci && npm run test:run && npm run build`,
- runs both jobs in parallel, because neither depends on the other.

`README.md` gets a CI status badge at the top. No backend or frontend source
changes.

## 3. Out of scope

- **Continuous deployment to Hetzner.** Deploying stays a deliberate manual step:
  SSH, then `docker-compose up`.
- **Building a Docker image in CI.** No registry is configured yet.
- **Dependabot and CodeQL.** Overkill for a solo portfolio project.
- **Workflows for branches other than `main`.**
- **Coverage reports and artifact uploads.**

## 4. Done when

- A push to `main` triggers the workflow on GitHub Actions.
- The backend job passes `./mvnw test` on a GitHub-hosted runner with Java 21.
- The frontend job passes `npm run test:run && npm run build` on Node 22.
- The CI badge in `README.md` shows green.
