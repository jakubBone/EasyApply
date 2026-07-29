# 1.0.0 — Docker Registry (GHCR)

## 1. Problem

Topic 12 added CI, so every push to `main` runs the tests and verifies the build.
The application is ready for production deployment on a Hetzner VPS.

But `docker-compose.yml` still uses `build:`, which means the server would build
its images from source and would therefore need Maven, Node.js and a JDK
installed. The server should run pre-built images, not be a build machine.
Rebuilding there is slow, fragile, and pollutes the production environment. And
without a registry there is no way to hand a built image from CI to the server at
all.

## 2. Solution

Extend the CI pipeline to build Docker images and push them to **GHCR**, the
GitHub Container Registry, once the tests pass. The server then pulls the ready
image and starts it with `docker-compose`.

```
git push main
    → CI: tests pass (backend + frontend jobs)
    → CI: docker build + push to ghcr.io  (docker job)
    → Server: docker-compose pull + up -d  ← manual deploy step
```

Two tags per image:

- `:latest` always points at the most recent image from `main`,
- `:<short-sha>` is immutable per commit, for example `:abc1234`, so an exact
  version can be pinned.

What changes: the `docker` job in `.github/workflows/ci.yml`; an `image:` field
on the `backend` and `frontend` services in `docker-compose.yml`, keeping
`build:` for local development; and a `VITE_API_URL` repository secret, because
the production API URL is baked into the frontend image at CI build time. No
backend or frontend source changes.

## 3. Out of scope

- **Automatic deployment to Hetzner.** Deploying stays a deliberate manual SSH
  step.
- **Separate staging and production images.** One branch, one image.
- **Image vulnerability scanning or SBOM generation.**
- **A GitHub Packages retention policy.** It can be set by hand once images
  accumulate.
- **PR builds.** The docker job runs only on a push to `main`.

## 4. Done when

- A push to `main` triggers the `docker` job after the backend and frontend jobs
  pass.
- Two packages appear under GitHub Packages: `applikon-backend` and
  `applikon-frontend`.
- Each image carries both `:latest` and `:<short-sha>`.
- `docker-compose pull` on the server downloads the new images without error, and
  `docker-compose up -d` starts the application from them.
