# Applikon — Deployment Introduction

> Background reading for the actual deployment guide.
> Covers: what deployment is, key terminology, how the options compare,
> and why this project chose a Hetzner VPS.
>
> **Ready to deploy?** → [`deployment-hetzner.md`](deployment-hetzner.md) (step-by-step)

---

## 1. What deployment actually is

### Your computer vs. the internet

Right now the application runs like this:

```
Your computer
├── you start the backend (Spring Boot)     → reachable at localhost:8080
├── you start the frontend (React/Vite)     → reachable at localhost:5173
└── PostgreSQL runs on your machine         → reachable at localhost:5432

Only YOU can use it.
Nobody else has access to "localhost" on your machine.
```

After deployment it looks like this:

```
Server (a computer somewhere else, on 24/7)
├── backend running                         → reachable from the internet
├── frontend running                        → reachable from the internet
└── PostgreSQL running                      → INTERNAL only (for security)

Anyone, anywhere, can type the address and use the app.
```

**Deployment = moving the app from "your computer" to "a server".**

---

### What is a server?

A server is just a regular computer. It differs from your laptop in that:
- It's running **24 hours a day, 7 days a week**
- It has a stable address on the internet (a stable IP)
- It has no monitor, mouse, or keyboard — you manage it remotely through a terminal (SSH)
- Usually it sits in a data center

---

### How a request to the app travels through the internet

The journey of a request when someone types `applikon.pl`:

```
1. User types "applikon.pl" in the browser
        ↓
2. The browser asks DNS: "what IP does applikon.pl have?"
   DNS answers: "157.90.11.22"
        ↓
3. The browser connects to IP 157.90.11.22 (your server)
        ↓
4. On the server, Caddy (the "doorkeeper" program) receives the request
   - if the request is for /api → forwards it to the backend
   - if the request is for anything else → forwards to the frontend
        ↓
5. The frontend returns HTML/CSS/JS files (the app pages)
   The backend returns data (JSON) when the app asks for it
        ↓
6. The browser renders the page. The user sees the app.
```

---

## 2. Glossary — what all those words mean

**IP (IP address)**
A unique "house number" on the internet. Example: `157.90.11.22`.
Every internet-connected computer has one. The problem: IP addresses are hard to
remember, which is why we have domains.

**Domain**
A human-readable name instead of an IP. `applikon.pl` instead of `157.90.11.22`.
You buy a domain from a registrar (e.g., nazwa.pl, OVH, Namecheap) for ~50 PLN/year.

**DNS (Domain Name System)**
The "phonebook of the internet". Translates domain names to IP addresses.
When you buy a domain, you configure DNS so it points to your server.

**VPS (Virtual Private Server)**
A virtual server in a data center. A company (e.g., Hetzner, DigitalOcean) owns
physical computers, slices them into smaller virtual servers, and rents them out.
You get "your slice" for ~€4/month. Always on, stable IP.

**Linux**
An operating system (like Windows, but different). Servers use Linux because:
- it's free
- it runs for months without restarts
- it's more stable and secure than Windows for server workloads
- developers worldwide use it

**SSH (Secure Shell)**
A way to connect remotely to a server through a terminal.
Instead of physically sitting at the server, you open a terminal on your own
computer and type commands — as if you were at the server.

```
You (Windows, terminal) ──SSH──▶ Server (Linux, no monitor)
```

**Docker**
A program that "packages" an app together with everything it needs (Java, Node.js,
libraries) into a so-called container.

A container = a package with the app and its environment.
Why it matters: "it works on my machine, it'll work on the server" — because the
environment is identical in both places.

This project already has `Dockerfile`s — instructions for how to package each service.

**docker-compose**
A tool that runs MULTIPLE containers at once according to a recipe in
`docker-compose.yml`. The file says: "run the database + backend + frontend".
One command (`docker compose up`) starts the whole stack.

**HTTPS / SSL / TLS / certificate**
Encryption of the connection between the browser and the server.
- HTTP = unencrypted (visible like a postcard)
- HTTPS = encrypted (visible like a sealed letter)

The "closed padlock" in the browser = HTTPS is working.
Without HTTPS, Google OAuth2 (login with Google) won't work.
A certificate is a file that makes the encryption possible.

**Let's Encrypt**
A free organization that issues HTTPS certificates. Works automatically.

**Caddy**
A program on the server that:
1. Automatically fetches an HTTPS certificate from Let's Encrypt
2. Routes traffic: `/api/*` → backend, the rest → frontend
3. Handles port 443 (HTTPS) and port 80 (HTTP), redirects HTTP→HTTPS

An alternative to nginx (which is more complicated) — Caddy is simpler.

**Reverse proxy**
That's what Caddy does — it stands "in front of" the app and decides where to
route requests. "Proxy" because it acts as a middleman. "Reverse" because it
routes traffic TO the server, not from it.

**Port**
A number representing a "door" on a computer. Each service listens on a different port.
- Port 80 = HTTP (unencrypted pages)
- Port 443 = HTTPS (encrypted pages)
- Port 8080 = the Spring Boot backend
- Port 5432 = PostgreSQL database

When you type `applikon.pl`, the browser connects to port 443 by default.

**Firewall**
A "port guard" on the server. Blocks connections to ports that should not be
exposed externally (e.g., 5432 for the database).

**OAuth2 / Google OAuth2**
"Sign in with Google" — instead of building a password system, the user
signs in with their Google account, and Google vouches for their identity.
This app already has it implemented.

**JWT (JSON Web Token)**
A signed ticket. After login, the backend gives the user a JWT — a "ticket" that
proves they're logged in. The browser sends this ticket on every request.
The backend verifies the ticket is authentic.

**Environment variable**
Configuration passed into the app from the outside, not hardcoded.
Example: the database password. Stored in a `.env` file (never committed to git).

---

## 3. What this project already has (deployment-relevant)

```
applikon-backend/Dockerfile    ← how to package the backend
applikon-frontend/Dockerfile   ← how to package the frontend
docker-compose.yml              ← recipe: "run db + backend + frontend"
.env.example                    ← template for environment variables
```

**Implication:** The app is roughly 90% deployment-ready. We don't need to build
container images by hand or write orchestration logic from scratch — we just need
to pick a place to run them and provide the production environment variables.

| Component | Deployment Impact |
|---|---|
| Spring Boot backend (Java 21) | Heavy — uses ~300–500 MB RAM, slow startup (~60s) |
| React frontend (static files, nginx) | Light — uses ~10 MB RAM |
| PostgreSQL | Requires persistent disk (data must survive restart) |
| Google OAuth2 | **Requires HTTPS** — Google won't accept HTTP in production |
| Dockerfiles ready | Same artifacts work on any Docker host |
| `docker-compose.yml` ready | Whole stack starts with one command |

---

## 4. Where to host it — comparison of options

### ✅ Hetzner VPS — chosen for this project

| Criterion | Value |
|---|---|
| Cost | ~€3.79/month (Hetzner CX22) |
| Difficulty | Medium (step-by-step guide handles it) |
| Control | Full |
| Persistent storage | Yes |
| HTTPS | Manual via Caddy (1 config file, auto-renewal) |
| Works with `docker-compose.yml` | Yes, directly |
| Learning value | High — real Linux + Docker + Caddy on a server |

**Why this fits Applikon:** the existing `docker-compose.yml` runs unchanged on
a Hetzner VPS. There's nothing to rewrite, no PaaS abstraction to fight with, and
the cost stays predictable as the project grows.

---

### ⚠️ Railway / Render / Fly.io — considered, not chosen

These are managed Platform-as-a-Service (PaaS) providers. Easier first deploy, but
each has a trade-off that mattered for this project:

| Provider | Cost | Why not chosen |
|---|---|---|
| **Railway** | $5/month (Hobby) | Locked into a vendor; CV file storage requires paid Volume add-on; cost grows fast above hobby usage |
| **Render** | Free, paid disks | Free tier sleeps after 15 min of inactivity (cold start ~60s for Spring Boot); persistent disk is paid |
| **Fly.io** | ~$5/month + extras | CLI-driven config (`fly.toml`) doesn't map cleanly onto an existing `docker-compose.yml` — extra rewrite work |

PaaS is a good choice when you want to skip Linux/networking entirely. For a
junior dev who wants the deployment experience to count for something on a CV,
running a real server wins.

---

### ⚠️ Self-hosted home server — possible later, not chosen now

Free in monthly cost, but adds operational complexity:
- Coordinating with whoever owns the hardware
- Dependency on a residential internet connection (often dynamic IP, asymmetric upload)
- ISP may block ports 80/443 for residential plans
- You're responsible for hardware uptime

Reasonable as a later second step once the deployment is well understood. Not a good first
production environment.

---

## 5. Why Hetzner specifically (vs. DigitalOcean, AWS, etc.)

**Hetzner** is a German cloud provider with the best price/performance ratio in
the EU. For a hobby/portfolio project:

- **Price:** CX22 (2 vCPU, 4 GB RAM) at ~€3.79/month is roughly half what DigitalOcean
  charges for an equivalent droplet
- **Location:** Helsinki and Falkenstein data centers are physically close to PL —
  good latency for users in Poland
- **GDPR-friendly:** EU-based, EU data centers — relevant given the project's RODO work (07-privacy-rodo)
- **No per-egress charges:** unlike AWS, you don't get surprised by bandwidth bills

**AWS / GCP / Azure** are overkill at this scale and have surprise-bill risk
(forgotten resources keep charging). They're great when you actually need their
managed services. Applikon doesn't.

---

## 6. Cost summary

| Item | Cost |
|---|---|
| Hetzner CX22 VPS | ~€3.79/month |
| `.pl` domain | ~50 PLN/year (~4 PLN/month) |
| HTTPS via Let's Encrypt | free |
| **Total** | **~€4–5/month** (~20 PLN) |

For 0–50 users, CX22 (4 GB RAM) is sufficient. Spring Boot needs ~500 MB,
PostgreSQL ~200 MB — that leaves ~3 GB headroom.

---

## 7. Next step

Concepts covered. Time to actually deploy.

→ [`deployment-hetzner.md`](deployment-hetzner.md) — step-by-step Hetzner deployment

---

*Last updated: 2026-05-04*
