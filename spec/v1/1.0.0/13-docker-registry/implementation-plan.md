# 1.0.0 13-docker-registry — Implementation Plan

## What changes

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Add the `docker` job: build and push to GHCR |
| `docker-compose.yml` | Add `image:` to the `backend` and `frontend` services |
| GitHub repo settings | Add the `VITE_API_URL` secret |

After every successful CI run, two images land in GHCR:
`ghcr.io/jakubbone/applikon-backend` and `ghcr.io/jakubbone/applikon-frontend`.
Each push produces `:latest`, which moves, and `:<short-sha>`, which does not.
The server pulls `:latest` and runs the application without building anything.

**Design decisions**

- **The `docker` job needs `backend` and `frontend`.** Images are pushed only
  when all tests pass, so a broken build never reaches the registry.
- **It runs only on a push, not on pull requests.** A PR triggers tests alone,
  and no image is pushed for an unmerged branch.
- **`GITHUB_TOKEN` authenticates to GHCR.** Actions has built-in write access, so
  no personal access token is stored in CI.
- **`docker-compose.yml` keeps both `image:` and `build:`.** `image:` names the
  registry image, and `build:` stays for local development with
  `docker-compose up --build`. On the server `docker-compose pull` uses `image:`
  and ignores `build:`.
- **`VITE_API_URL` is a GitHub secret.** The production API URL is baked into the
  frontend bundle at CI build time, so it must not sit in the repository.
- **The short SHA tag** uses `${GITHUB_SHA::7}`, which is readable and matches
  `git log --oneline`, rather than the full 40 characters.
- **Package visibility follows the repository.** A public repo gives public
  packages, so the server needs no `docker login` to pull.

## Step 1 — The GitHub secret

**Build** — in the repository, under Settings, Secrets and variables, Actions,
add a new repository secret:

| Name | Value |
|------|-------|
| `VITE_API_URL` | the production API URL, for example `https://api.yourdomain.com/api` |

**Checklist**
- [x] `VITE_API_URL` secret added

## Step 2 — The `docker` job

**Build** — add this job to `.github/workflows/ci.yml`, below the existing
`frontend` job:

```yaml
  docker:
    name: Docker — build and push to GHCR
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./applikon-backend
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/applikon-backend:latest
            ghcr.io/${{ github.repository_owner }}/applikon-backend:${{ github.sha }}

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./applikon-frontend
          push: true
          build-args: |
            VITE_API_URL=${{ secrets.VITE_API_URL }}
            VITE_USE_BACKEND=true
          tags: |
            ghcr.io/${{ github.repository_owner }}/applikon-frontend:latest
            ghcr.io/${{ github.repository_owner }}/applikon-frontend:${{ github.sha }}
```

**Checklist**
- [x] The `docker` job builds and pushes after `backend` and `frontend` pass
- [x] Both images are in GHCR with `:latest` and `:<sha>` tags

## Step 3 — `docker-compose.yml`

**Build** — add `image:` to both services and leave every existing `build:`
section intact:

```yaml
  backend:
    image: ghcr.io/jakubbone/applikon-backend:latest
    build:
      context: ./applikon-backend
      dockerfile: Dockerfile
    # ... rest unchanged

  frontend:
    image: ghcr.io/jakubbone/applikon-frontend:latest
    build:
      context: ./applikon-frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_USE_BACKEND: ${VITE_USE_BACKEND:-true}
    # ... rest unchanged
```

**Done when** a push shows all three jobs green in GitHub Actions, GitHub
Packages lists both images with their two tags, and the server can
`docker-compose pull` and `up -d` from them.

**Checklist**
- [x] `image:` fields point at GHCR on both services
- [x] `docker-compose pull` on the server downloads the images
