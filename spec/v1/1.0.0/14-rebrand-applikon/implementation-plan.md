# 1.0.0 14-rebrand-applikon — Implementation Plan

## What changes

| Category | Files | Notes |
|----------|-------|-------|
| Java sources (package and class) | ~80 | Most are handled by the IDE package rename |
| Backend configs | 4 | `pom.xml`, `application.properties`, `OpenApiConfig`, the JWT issuer |
| Frontend code and tests | ~15 | Component, service and test references |
| Frontend i18n | 4 | `pl/common`, `en/common`, `pl/tour`, `en/tour` |
| Infrastructure | 5 | `docker-compose`, `.env.example`, CI, `.claude` configs |
| Top-level docs | 4 | `README`, `CLAUDE.md`, `SECURITY.md`, `spec/README.md` |
| Spec docs | ~30 | `spec/v1/**`, `spec/v2/**`, `spec/deployment/**` |
| Claude tooling | 4 | Mentor refactor commands and skill references |
| **Total** | **~147 files, 545 occurrences** | |

The running application stays functionally identical.

**Design decisions**

- **The package rename goes through the IDE.** IntelliJ's Refactor, Rename
  Package updates every import atomically, which is safer than a text replace.
- **Folder renames go through `git mv`.** The IDE does not reliably rename
  top-level Maven modules, so the folders are renamed explicitly and the path
  references in `pom.xml`, `docker-compose.yml`, CI and the docs are updated by
  hand.
- **The logo is a text-only swap.** The PNG keeps its briefcase graphic, colours,
  font and shape. Only the wordmark changes, and the favicon and every other
  asset stay untouched.
- **The database stays as it is.** Renaming would need a migration with no
  functional benefit.
- **The GitHub repository redirect does the rest.** GitHub auto-redirects old
  `EasyApply` URLs after the rename, so existing LinkedIn posts keep working.

## Step 1 — Backend

Commit: `refactor(backend): rename module and package to applikon`

**Build**
1. `git mv easyapply-backend applikon-backend`.
2. Java package rename in IntelliJ: right-click `com.easyapply`, Refactor,
   Rename, to `applikon`, applied across every subpackage. Verify that searching
   for `com.easyapply` returns nothing.
3. `EasyApplyApplication.java` becomes `ApplikonApplication.java`, renaming both
   the file and the class so the IDE updates references.
4. `applikon-backend/pom.xml` — `groupId` to `com.applikon`, `artifactId` to
   `applikon-backend`, and the brand in `<name>` and `<description>`.
5. `application.properties` — `spring.application.name=applikon`.
6. `OpenApiConfig.java` — the title and description in `@OpenAPIDefinition`.
7. `JwtService.java` — `.issuer("easyapply")` becomes `.issuer("applikon")`.
   Tokens already in flight will be rejected after deploy, which is acceptable
   for a portfolio project.
8. `V1__init_schema.sql` — the comment header only, no schema change.
9. Tests — update anything asserting on the app name, such as
   `SystemControllerTest` and `WithMockAuthenticatedUser`.

**Checklist**
- [x] Folder, package and main class renamed
- [x] `pom.xml`, `application.properties`, `OpenApiConfig`, JWT issuer updated
- [x] Tests asserting on the app name updated

## Step 2 — Frontend

Commit: `refactor(frontend): rename module to applikon`

**Build**
1. `git mv easyapply-frontend applikon-frontend`.
2. `package.json` and `package-lock.json` — the `name` field.
3. `index.html` — the `<title>`, a short `<meta name="description">`, and
   `og:title`, `og:description` and `og:url` so LinkedIn previews show the new
   brand.
4. The logo lives as a PNG in `public/`, not as a component. Regenerate
   `logo-trim.png` and `logo_white.png` with the identical graphic, colours,
   font, shape and layout, changing only the wordmark. The filenames stay the
   same, so no import path changes. Update the `alt` attributes in
   `AppContent.tsx` and `LoginPage.tsx`. `public/favicon.svg` is untouched.
5. i18n bundles — `pl/common.json`, `en/common.json`, `pl/tour.json`,
   `en/tour.json`.
6. String literals in `AppContent.tsx`, `services/api.ts`, `pages/LoginPage.tsx`,
   `pages/Settings.tsx`, `components/auth/ConsentGate.tsx`, `types/domain.ts`.
7. The privacy policy in `src/content/privacyPolicy.ts` — six occurrences. The
   data controller does not change, only the brand name.
8. Tests asserting on the rendered brand: `PrivacyPolicy.test.tsx`,
   `App.test.tsx`, `Settings.test.tsx`, `ConsentGate.test.tsx`.
9. `cypress/support/e2e.ts`.

**Checklist**
- [x] Folder, `package.json` and `index.html` with OG meta updated
- [x] Logo PNGs regenerated with the new wordmark; `alt` attributes updated
- [x] i18n bundles, code references and the privacy policy updated
- [x] Frontend and Cypress tests updated

## Step 3 — Infrastructure

Commit: `chore(infra): rename services and paths to applikon`

**Build**
1. `docker-compose.yml` — service names, `container_name` where set, network
   aliases, and the image references from topic 13.
2. `.env.example` — variable names and comments.
3. `.github/workflows/ci.yml` — the `working-directory` values, and the GHCR
   image names if already wired.
4. `.claude/commands/mentor-refactor-backend.md` and
   `mentor-refactor-frontend.md` — path references.
5. `.claude/skills/code-review-backend/references/java-conventions.md` — the
   package examples.
6. `applikon-frontend/.claude/settings.local.json` — moved by the folder rename,
   so verify its internal paths.

**Checklist**
- [x] `docker-compose.yml`, `.env.example` and the CI workflow updated
- [x] `.claude` commands, skills and local settings updated

## Step 4 — Documentation

Commit: `docs(spec): rebrand from EasyApply to Applikon`

**Build**
1. `README.md` — title, badges, description, the `applikon-{backend,frontend}`
   paths, plus a live demo link and the tagline as a subtitle.
2. `CLAUDE.md` — the first line and the folder paths in the commands table.
3. `SECURITY.md` — brand references.
4. `spec/README.md` — brand references and a row for this topic.
5. `spec/v1/architecture.md`, `security.md` and `as-built.md` — titles and body.
6. `spec/v1/1.0.0/01-vision/brief.md`.
7. Every topic doc from `02-` to `13-`, including the learning notes under
   `04-mvp-refactoring/learning/` and `05-additional-features/i18n/learning/`.
8. `spec/v2/vision.md`.
9. `spec/deployment/deployment-intro.md` and `deployment-hetzner.md`, including
   hostnames and container references.

**Done when** the whole verification block passes:

```bash
# Inventory check — should print nothing
grep -ri "easyapply" . --exclude-dir=.git --exclude-dir=node_modules \
                      --exclude-dir=target --exclude-dir=dist

cd applikon-backend && ./mvnw test
cd ../applikon-frontend && npm run lint && npm run test:run && npm run build
cd .. && docker-compose up --build
```

**Checklist**
- [x] All documentation rebranded
- [x] Zero matches for `easyapply` outside `.git/`, `node_modules/`, `target/`, `dist/`
- [x] Backend tests green; frontend lint, tests and build green
- [x] `docker-compose up` starts `applikon-backend` and `applikon-frontend`

## Step 5 — External, no commit

**Build**
1. GitHub — Settings, General, rename the repository to `applikon`.
2. Confirm the auto-redirect resolves the old URL.
3. Deploy: pull on Hetzner, `docker-compose up`, then smoke-test login and
   navigation.
4. Open `aplikujbezspiny.pl` in incognito and confirm the logo, title and OG
   preview.
5. Update the pinned project link on LinkedIn if it still shows the old URL.
6. Optionally regenerate the OG preview image so LinkedIn shares stop showing a
   cached "EasyApply".

**Checklist**
- [x] Repository renamed and the redirect verified
- [x] Deployed, with `aplikujbezspiny.pl` showing the new branding
