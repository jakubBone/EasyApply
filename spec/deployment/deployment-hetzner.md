# Applikon — Hetzner Deployment (Step-by-Step)

> Production deployment guide. Pure how-to — concepts, terminology, and the
> rationale for choosing Hetzner are in [`deployment-intro.md`](deployment-intro.md).
>
> Stack: Hetzner VPS (CX22, Ubuntu 24.04) + Docker Compose + Caddy.
> Time: ~30 min preparation, ~1 hour deployment.

---

## Prerequisites

### Accounts and tools to have ready
- [ ] Hetzner Cloud account ([hetzner.com](https://hetzner.com)) — credit card required
- [ ] A domain (e.g., `applikon.pl`) — or a free subdomain via DuckDNS
- [ ] Google Cloud Console project (for OAuth2 credentials)
- [ ] Git installed locally
- [ ] SSH installed locally (Windows 10+ has it built-in)

### Code-side fixes (before first deploy)

Two things in `docker-compose.yml` must be patched before going to production:

**Fix 1 — don't expose port 5432 publicly.** In the `db:` service, remove:
```yaml
ports:
  - "5432:5432"
```
The backend reaches the DB through the internal Docker network. Exposing 5432
to the internet is a critical security hole.

**Fix 2 — don't hardcode the dev profile.** In the `backend:` service, change:
```yaml
SPRING_PROFILES_ACTIVE: dev
```
to:
```yaml
SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-prod}
```
Otherwise the production server will run with the dev profile.

---

## Step 1 — Generate an SSH key on your computer

```bash
ssh-keygen -t ed25519 -C "your-email@gmail.com"
```

Press Enter 3 times (default path, no passphrase). The public key is at:
```
C:\Users\YourName\.ssh\id_ed25519.pub
```

Open it in a text editor and copy the entire line — you'll paste it into
Hetzner in Step 2.

---

## Step 2 — Create the server on Hetzner

1. Log in to [console.hetzner.cloud](https://console.hetzner.cloud)
2. **New Project** → **Add Server**:
   - **Location:** Helsinki or Falkenstein (lower latency for PL users)
   - **Image:** Ubuntu 24.04
   - **Type:** **CX22** (2 vCPU, 4 GB RAM, ~€3.79/month) — minimum that comfortably runs Spring Boot
   - **SSH Key:** paste the public key from Step 1
3. Save the server's public IP (e.g., `157.90.xxx.xxx`)

---

## Step 3 — Point your domain at the server

In your domain provider's DNS panel, add an A record:

```
Type:  A
Name:  @                     (root domain — or "app" for a subdomain)
Value: 157.90.xxx.xxx        (your server IP)
TTL:   3600
```

DNS propagation takes anywhere from a few minutes to 24 hours. You can verify
with:
```bash
nslookup applikon.pl
```

---

## Step 4 — Connect to the server via SSH

```bash
ssh root@157.90.xxx.xxx
```

When you see a prompt like:
```
root@ubuntu:~#
```
you're on the server. Run all subsequent commands here unless explicitly noted.

---

## Step 5 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

Verify:
```bash
docker --version
```

---

## Step 6 — Install Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Caddy will provision and renew the HTTPS certificate from Let's Encrypt
automatically — no further config needed for SSL.

---

## Step 7 — Configure firewall

```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

`ufw` denies everything except what you explicitly allow.

---

## Step 8 — Configure Google OAuth2 for production

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project
2. **APIs & Services** → **Credentials** → click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs** add:
   ```
   https://your-domain.com/login/oauth2/code/google
   ```
   (must be HTTPS — Google rejects HTTP for production)
4. Save. Copy `Client ID` and `Client Secret` — you'll paste them into `.env` in Step 10

---

## Step 9 — Copy the project to the server

On the server:
```bash
mkdir -p /opt/applikon
cd /opt/applikon
git clone https://github.com/YourAccount/Applikon.git .
```

For a private repo, use `scp` from your local machine instead:
```bash
scp -r /path/to/local/project root@SERVER_IP:/opt/applikon
```

---

## Step 10 — Create the production `.env`

```bash
cd /opt/applikon
cp .env.example .env
nano .env
```

Fill in:
```env
# Database
POSTGRES_DB=applikon_db
POSTGRES_USER=applikon_user
POSTGRES_PASSWORD=<generate with: openssl rand -base64 32>

# Backend
SPRING_PROFILES_ACTIVE=prod
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Frontend — URL is baked into the build (see Pitfall 1 below)
VITE_API_URL=https://your-domain.com/api

# Google OAuth2 (from Step 8)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Frontend URL (used for OAuth2 redirect)
FRONTEND_URL=https://your-domain.com
```

> **Never commit `.env` to git.** Verify:
> ```bash
> grep -E "^\.env$" .gitignore
> ```
> should return `.env` (but not `.env.example`).

---

## Step 11 — Configure Caddy

```bash
nano /etc/caddy/Caddyfile
```

Paste (replace `your-domain.com`):
```caddyfile
your-domain.com {
    handle /api/* {
        reverse_proxy localhost:8080
    }

    handle /oauth2/* {
        reverse_proxy localhost:8080
    }

    handle /login/oauth2/* {
        reverse_proxy localhost:8080
    }

    handle /actuator/* {
        reverse_proxy localhost:8080
    }

    handle {
        reverse_proxy localhost:3000
    }
}
```

Reload Caddy:
```bash
systemctl reload caddy
```

Caddy will now request a Let's Encrypt certificate on the first HTTPS request
to your domain.

---

## Step 12 — Start the application

```bash
cd /opt/applikon
docker compose up -d --build
```

`--build` builds the images (Java/Node compile, ~5–10 min on first run).
`-d` runs detached so the terminal stays free.

Watch progress:
```bash
docker compose logs -f backend
```

Backend is ready when you see:
```
Started ApplikonApplication in 45.3 seconds
```

Press `Ctrl+C` to stop tailing the logs (the app keeps running).

---

## Step 13 — Verify everything works

Container status — all should be `healthy` or `running`:
```bash
docker compose ps
```

Backend health check:
```bash
curl http://localhost:8080/actuator/health
```
Should return `{"status":"UP"}`.

Then in a browser, go to `https://your-domain.com` and walk through:

- [ ] Page loads over HTTPS (lock icon in the address bar)
- [ ] "Login with Google" button works end-to-end
- [ ] After login, the Kanban board renders
- [ ] Adding a job application persists across refresh
- [ ] Logout returns you to the login screen
- [ ] Re-login works (refresh-token flow)

---

## Step 14 — SSH hardening (apply once)

By default SSH accepts password logins from the entire internet — bots scan for
this. Lock it down to keys only:

```bash
nano /etc/ssh/sshd_config
```

Find or add:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
```

Save (`Ctrl+X`, `Y`, Enter), then:
```bash
systemctl restart sshd
```

> ⚠️ Make sure the SSH key from Step 1 actually works **before** you do this —
> otherwise you can lock yourself out.

---

## Day-to-day operations

### Deploy a code update

The server runs pre-built images from GHCR and never compiles anything — CI builds
and pushes them on every green `main` (see
[`../v1/1.0.0/13-docker-registry/brief.md`](../v1/1.0.0/13-docker-registry/brief.md)).
`build:` stays in `docker-compose.yml` for local development only.

**Before touching the server:** the CI run for the commit you are deploying must be
green — the `docker` job is what publishes the images. Deploying earlier just pulls
the previous release.

```bash
cd /opt/applikon
git pull                     # docker-compose.yml and Caddy config — NOT sources to build
docker compose pull          # the actual new code, from GHCR
docker compose up -d
docker compose logs -f backend
```

Ready when the log shows `Started ApplikonApplication` (~60 s). Named volumes are
untouched, so database and uploads survive.

**If the release adds an environment variable**, put it in `/opt/applikon/.env`
(the root one, read by docker-compose) *before* `up -d`, and make sure `git pull`
brought the matching `docker-compose.yml` — a variable absent from the compose file
never reaches the container, however correct `.env` is.

**If the release adds a Flyway migration**, back up first — migrations are
forward-only and `validate-on-migrate` is on, so an older image will refuse to start
against an already-migrated database:
```bash
docker exec applikon-db pg_dump -U applikon_user applikon_db > backup_pre_<version>.sql
```

**Verify in this order** — it separates a broken deploy from a broken feature:
`docker compose ps` all healthy → `curl http://localhost:8080/actuator/health` →
login → board renders → a new application survives a refresh → only then the
release's own feature.

**Rollback.** Frontend is clean — pin the previous commit SHA (tags are full SHAs;
there is no `:vX.Y.Z` image tag):
```bash
docker compose pull frontend    # after editing image: to ...frontend:<sha>
```
Backend is only clean if no migration ran; otherwise restore the dump.

### Reclaim disk after deploying
```bash
docker system df             # see the Images / Build Cache split
docker image prune -f        # untagged images left behind by pull
docker builder prune -f      # build cache (only grows if someone builds on the server)
```
Safe by design: both skip anything a running container uses.

### Read live logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Restart a single service
```bash
docker compose restart backend
```

### Stop / start the whole stack
```bash
docker compose stop
docker compose start
```

### Database backup (run weekly)
```bash
docker exec applikon-db pg_dump -U applikon_user applikon_db > backup_$(date +%Y%m%d).sql
```

Copy the backup off the server (run from your **local** machine):
```bash
scp root@SERVER_IP:/opt/applikon/backup_*.sql C:\Users\YourName\Desktop\
```

### Auto-restart after server reboot

Add `restart: unless-stopped` to each service in `docker-compose.yml`:
```yaml
services:
  db:
    restart: unless-stopped
    ...
  backend:
    restart: unless-stopped
    ...
  frontend:
    restart: unless-stopped
    ...
```

---

## Pitfalls — what bites first-time deployers

### Pitfall 1: `VITE_API_URL` is baked in at build time
React/Vite compiles `VITE_API_URL` into the static JS bundle during the build.
If you set it incorrectly and run `docker compose build`, the wrong value is
permanently inside the bundle until you rebuild.

**Always** set the production URL in `.env` **before** the first
`docker compose up -d --build`.

### Pitfall 2: Google OAuth2 requires HTTPS
Google rejects OAuth2 callbacks over plain HTTP in production. Caddy (Step 11)
gives you HTTPS automatically — but the domain must already point at the server
(Step 3) or the certificate request fails.

### Pitfall 3: `docker compose down -v` deletes volumes
The `-v` flag removes named volumes — including PostgreSQL data and any uploaded
files. Use `docker compose down` (no `-v`) in production.

### Pitfall 4: `.env` in the repo = passwords leaked
Always verify `.env` is in `.gitignore`. Never `git add .env` — once in git
history, the secret is effectively burned, even if you delete the file later.

### Pitfall 5: No backup means no rollback
`docker-compose.yml` doesn't back up PostgreSQL automatically. The first time
you accidentally drop a table or migration, you'll wish you'd run weekly backups
(see "Day-to-day operations" above).

---

## Final checklist

### Before deployment
- [ ] `docker-compose.yml`: removed `ports: 5432:5432` from `db`
- [ ] `docker-compose.yml`: `SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-prod}` in `backend`
- [ ] `docker-compose.yml`: `restart: unless-stopped` on every service
- [ ] Hetzner CX22 server provisioned (Ubuntu 24.04)
- [ ] Domain A record points at the server IP
- [ ] Google OAuth2 redirect URI configured with the production HTTPS URL
- [ ] `.env` filled in (and **not** committed to git)

### After deployment
- [ ] `https://your-domain.com/actuator/health` returns `{"status":"UP"}`
- [ ] Google login works end-to-end
- [ ] Adding an application persists across refresh
- [ ] HTTPS padlock visible in the browser
- [ ] SSH password authentication disabled
- [ ] First database backup taken

---

*Last updated: 2026-07-22*
