# Applikon — Docker Registry (GHCR)

## 1. Context

`12-ci` added CI: every push to `master` runs tests and verifies the build.
The application is ready for production deployment on a Hetzner VPS.
Currently `docker-compose.yml` uses `build:` — the server would need to build
images locally from source, requiring Maven, Node.js, and JDK on the VPS.

---

## 2. Problem

- The server should not be a build machine — it should only run pre-built images.
- Without a registry, there is no way to deliver a built image from CI to the server.
- Rebuilding on the server is slow, fragile, and pollutes the production environment.

---

## 3. Decision

Extend the existing CI pipeline to build Docker images and push them to
**GHCR (GitHub Container Registry)** after tests pass.
The server pulls the ready image and starts it with `docker-compose`.

**Flow:**
```
git push master
    → CI: tests pass (backend + frontend jobs)
    → CI: docker build + push to ghcr.io  (docker job)
    → Server: docker-compose pull + up -d  ← manual deploy step
```

**Tagging strategy:**
- `:latest` — always points to the most recent image from `master`
- `:<short-sha>` — immutable tag per commit (e.g. `:abc1234`); allows pinning an exact version

**What we do NOT add:**
- Automatic deployment to the server (CD) — deploy stays a deliberate manual SSH step
- Multiple environment images (staging/prod) — single `master` branch, single image
- Docker image vulnerability scanning or SBOM generation

---

## 4. Scope

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Add `docker` job — build + push both images to GHCR |
| `docker-compose.yml` | Add `image:` field to `backend` and `frontend` services (keep `build:` for local dev) |
| GitHub repo settings | Add secret `VITE_API_URL` (production API URL baked into frontend image at CI build time) |

No backend or frontend source code changes.

---

## 5. Out of Scope

- Automatic deploy (CD) to Hetzner
- Staging environment or branch-based images
- Image vulnerability scanning (Trivy, Snyk)
- GitHub Packages retention policy — can be configured manually after first images accumulate
- PR builds — docker job only runs on `push` to `master`, not on pull requests

---

## 6. Success Criteria (Definition of Done)

`13-docker-registry` is closed when:

1. [ ] Push to `master` triggers the `docker` CI job after `backend` and `frontend` jobs pass
2. [ ] Two packages appear in GitHub → Packages: `applikon-backend` and `applikon-frontend`
3. [ ] Each image has both `:latest` and `:<short-sha>` tags
4. [ ] `docker-compose pull` on the server downloads the new images without error
5. [ ] `docker-compose up -d` starts the application from the pulled images

---

## 7. Implementation Order

1. Add `VITE_API_URL` secret in GitHub repo settings (Settings → Secrets → Actions)
2. Extend `.github/workflows/ci.yml` with the `docker` job
3. Add `image:` fields to `docker-compose.yml`
4. Push to `master`, verify images appear in GitHub → Packages
5. On server: `docker-compose pull && docker-compose up -d`

---

## 8. Related Documents

- `spec/v1/1.0.0/12-ci/brief.md` — previous topic, CI pipeline foundation
- `spec/v1/1.0.0/13-docker-registry/implementation-plan.md` — exact file changes
- `spec/deployment/deployment-hetzner.md` — server setup and deploy commands
- `spec/README.md` — spec index

---

*Created: 2026-05-07*
