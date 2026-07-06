# Rebrand Implementation Plan — EasyApply → Applikon

## Work Process

1. **Phase-by-phase commits** — Claude executes each phase, proposes commit
   message, user runs `git add` + `git commit`.
2. **Tests at the end** — `./mvnw test` and the frontend build run **once after
   Phase 4** (per project convention).
3. **Live verification** — after deploy, user opens `aplikujbezspiny.pl` and
   confirms the new branding renders.

---

## Goal

Replace every reference to `EasyApply` / `easyapply` / `com.easyapply` with the
new `Applikon` / `applikon` / `com.applikon` brand, leaving the running
application functionally identical.

---

## Design Decisions

- **Package rename via IDE refactor** — IntelliJ `Refactor → Rename Package`
  updates all imports atomically; safer than text-replace.
- **Folder rename via `git mv`** — IDE doesn't reliably rename top-level Maven
  modules; rename folders explicitly and update path references in `pom.xml`,
  `docker-compose.yml`, CI, and docs.
- **Tagline placement: landing only (Option C)** — in-app logo is just
  "Applikon"; tagline "Aplikuj bez spiny" appears in `README.md`, in the landing
  hero, and as `<meta name="description">`.
- **Logo: text-only swap** — keep the current PNG logo image (briefcase
  graphic, colours, font, shape, all visual details). Only the wordmark text
  changes from `EasyApply` to `Applikon`. Regenerate `logo-trim.png` and
  `logo_white.png` with identical layout/styling, just the new text. No
  changes to the favicon or any other graphic asset.
- **Database stays as-is** — renaming would require a migration with no
  functional benefit.
- **GitHub repo redirect** — GitHub auto-redirects old `EasyApply` URLs after
  rename, so existing LinkedIn posts keep working.

---

## Implementation

### Phase 1 — Backend

`refactor(backend): rename module and package to applikon`

1. **Folder rename**: `git mv easyapply-backend applikon-backend`.
2. **Java package rename** (IntelliJ):
   - Right-click `com.easyapply` → `Refactor → Rename` → `applikon`.
   - Apply across all subpackages.
   - Verify: search for `com.easyapply` returns zero matches.
3. **Main class**: `EasyApplyApplication.java` → `ApplikonApplication.java`
   (rename file + class, IDE updates references).
4. **`applikon-backend/pom.xml`**:
   - `<groupId>com.easyapply</groupId>` → `<groupId>com.applikon</groupId>`
   - `<artifactId>easyapply-backend</artifactId>` → `applikon-backend`
   - `<name>` and `<description>` — replace `EasyApply` with `Applikon`.
5. **`application.properties`**:
   - `spring.application.name=easyapply` → `applikon`.
6. **`OpenApiConfig.java`** — title and description in `@OpenAPIDefinition`.
7. **`JwtService.java`** — `.issuer("easyapply")` → `.issuer("applikon")`
   (line ~49). Note: existing tokens in flight will be rejected after deploy;
   acceptable since this is a portfolio project.
8. **`V1__init_schema.sql`** — only the comment header, no schema change.
9. **Tests** — update any test that asserts on app name (e.g.
   `SystemControllerTest`, `WithMockAuthenticatedUser`).

### Phase 2 — Frontend

`refactor(frontend): rename module to applikon`

1. **Folder rename**: `git mv easyapply-frontend applikon-frontend`.
2. **`package.json`** + **`package-lock.json`**:
   `"name": "easyapply-frontend"` → `"applikon-frontend"`.
3. **`index.html`**:
   - `<title>` → `Applikon — Aplikuj bez spiny`
   - `<meta name="description">` — short Polish/English line about the tracker.
   - Add or update `<meta property="og:title">`, `og:description`, `og:url`
     so LinkedIn previews show the new brand.
4. **Logo image** — the logo lives as a PNG in `public/`, not as a text
   component:
   - `public/logo-trim.png` — used in `AppContent.tsx` header and
     `pages/LoginPage.tsx`.
   - `public/logo_white.png` — white-on-dark variant.
   Regenerate both files with identical briefcase graphic, colours, font,
   shape, and layout — only the wordmark text changes from `EasyApply` to
   `Applikon`. Replace the files in `public/` (filenames stay the same so no
   import paths change).
   Update `alt` attributes in `AppContent.tsx` and `LoginPage.tsx`:
   `alt="EasyApply logo"` → `alt="Applikon logo"`,
   `alt="EasyApply"` → `alt="Applikon"`.
   Favicon (`public/favicon.svg`) stays untouched.
5. **i18n bundles**:
   - `pl/common.json`, `en/common.json`, `pl/tour.json`, `en/tour.json` —
     replace `EasyApply` with `Applikon`.
6. **Code references** — replace string literals in:
   - `AppContent.tsx`
   - `services/api.ts`
   - `pages/LoginPage.tsx`, `pages/Settings.tsx`
   - `components/auth/ConsentGate.tsx`
   - `types/domain.ts`
7. **Privacy policy** (`src/content/privacyPolicy.ts`) — 6 occurrences;
   replace brand name in user-facing legal text. Same data controller, brand
   rename only.
8. **Tests** — update assertions on rendered "EasyApply":
   `PrivacyPolicy.test.tsx`, `App.test.tsx`, `Settings.test.tsx`,
   `ConsentGate.test.tsx`.
9. **Cypress** — `cypress/support/e2e.ts`.

### Phase 3 — Infra

`chore(infra): rename services and paths to applikon`

1. **`docker-compose.yml`** — service names (`easyapply-backend` →
   `applikon-backend`, same for frontend), `container_name` if set, network
   aliases, image references in phase-13 docker-registry plan.
2. **`.env.example`** — variable names, comments.
3. **`.github/workflows/ci.yml`** — `working-directory: easyapply-backend` →
   `applikon-backend`, same for frontend. Update GHCR image names if already
   wired (`ghcr.io/jakubbone/easyapply-*` → `applikon-*`).
4. **`.claude/commands/mentor-refactor-backend.md`**,
   **`mentor-refactor-frontend.md`** — path references.
5. **`.claude/skills/code-review-backend/references/java-conventions.md`** —
   package examples.
6. **`applikon-frontend/.claude/settings.local.json`** — relocated by folder
   rename; verify internal paths.

### Phase 4 — Documentation

`docs(spec): rebrand from EasyApply to Applikon`

1. **`README.md`** — title, badges, project description, paths to
   `applikon-{backend,frontend}`. Add live demo link
   `https://aplikujbezspiny.pl` and tagline as subtitle.
2. **`CLAUDE.md`** — first line `# EasyApply — CLAUDE.md` →
   `# Applikon — CLAUDE.md`. Update folder paths in commands table.
3. **`SECURITY.md`** — brand references.
4. **`spec/README.md`** — add row for phase 14, update brand references.
5. **`spec/v1/architecture.md`**, **`security.md`**, **`as-built.md`** —
   replace in titles + body. Add as-built entry for phase 14.
6. **`spec/v1/1.0.0/01-vision/brief.md`** — replace.
7. **All phase docs** (`02-` through `13-`) — replace in titles, headers, body
   text. Existing learning notes in `04-mvp-refactoring/learning/*` and
   `05-additional-features/i18n/learning/*` get the brand replaced too.
8. **`spec/v2/vision.md`** — replace.
9. **`spec/deployment/deployment-intro.md`**,
   **`deployment/deployment-hetzner.md`** — replace, including hostnames and
   container references.

### Phase 5 — External (no commit)

1. **GitHub** — Settings → General → Rename repository `EasyApply` → `applikon`.
2. **Verify auto-redirect** — `github.com/jakubBone/EasyApply` should resolve to
   the new URL.
3. **Deploy** — pull on Hetzner, `docker-compose up`, smoke-test login +
   navigate.
4. **Verify production** — open `aplikujbezspiny.pl` in incognito, confirm logo,
   title, OG preview render.
5. **LinkedIn / portfolio** — update pinned project link if it shows old URL.
6. **Optional** — generate a fresh OG preview image so LinkedIn shares display
   "Applikon" rather than cached "EasyApply".

---

## Verification (after Phase 4)

```bash
# Inventory check — should print no results
grep -ri "easyapply" . --exclude-dir=.git --exclude-dir=node_modules \
                      --exclude-dir=target --exclude-dir=dist

# Backend
cd applikon-backend && ./mvnw test

# Frontend
cd ../applikon-frontend && npm run lint && npm run test:run && npm run build

# Full stack
cd .. && docker-compose up --build
```

---

## Definition of Done

- ✅ Zero matches for `easyapply` (case-insensitive) outside `.git/`,
      `node_modules/`, `target/`, `dist/`.
- ✅ Backend tests green.
- ✅ Frontend lint, tests, and build green.
- ✅ `docker-compose up` brings up `applikon-backend` and `applikon-frontend`.
- ✅ GitHub repo renamed to `applikon`.
- ✅ `spec/README.md` updated with phase 14 row.
- ✅ `spec/v1/as-built.md` updated.

---

## Files to Change (summary)

| Category | Files | Notes |
|----------|-------|-------|
| Java sources (package + class) | ~80 | Most resolved by IDE package rename |
| Backend configs | 4 | `pom.xml`, `application.properties`, `OpenApiConfig`, JWT issuer |
| Frontend code + tests | ~15 | Component + service + test refs |
| Frontend i18n | 4 | `pl/common`, `en/common`, `pl/tour`, `en/tour` |
| Infra | 5 | `docker-compose`, `.env.example`, CI, `.claude` configs |
| Top-level docs | 4 | `README`, `CLAUDE.md`, `SECURITY.md`, `spec/README.md` |
| Spec docs | ~30 | `spec/v1/**`, `spec/v2/**`, `spec/deployment/**` |
| Claude tooling | 4 | Mentor refactor commands + skills references |
| **Total** | **~147 files / 545 occurrences** | |

---

*Created: 2026-05-10*
