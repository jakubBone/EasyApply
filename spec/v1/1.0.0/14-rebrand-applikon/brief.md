# 1.0.0 — Rebrand to Applikon

## 1. Problem

The project was originally called "EasyApply". That name collides with
LinkedIn's "Easy Apply" feature and with an existing job tracker,
applicotrack.com, which weakens the brand identity of a portfolio project. After
a research pass over the alternatives, **Applikon** was chosen.

The old name is everywhere: 545 occurrences of `EasyApply` or `easyapply` across
147 files. The Java package `com.easyapply.*` is referenced in roughly 80 backend
files. Two top-level folders, `easyapply-backend` and `easyapply-frontend`, drive
paths in CI, in `docker-compose`, and in the deployment docs. User-facing copy —
the privacy policy, the login page, the i18n bundles — still says EasyApply.

The Polish identity "Aplikuj bez spiny" stays on the `aplikujbezspiny.pl` domain.
Only the technical and English brand becomes Applikon.

## 2. Solution

A full rename, split into four commit-sized steps plus one external step, ordered
so the build stays green at every commit.

1. **Backend** — rename the folder, the Java package `com.easyapply` to
   `com.applikon` through an IDE refactor, the main class, `pom.xml`,
   `application.properties`, the OpenAPI title and the JWT issuer.
2. **Frontend** — rename the folder, `package.json`, `index.html`, the logo
   component, the OG meta, the i18n bundles, the privacy policy, and code and
   test references.
3. **Infrastructure** — `docker-compose.yml`, `.env.example`, the CI workflow,
   `.claude/**`.
4. **Docs** — `README.md`, `CLAUDE.md`, `SECURITY.md`, all of `spec/**`.
5. **External, no commit** — rename the GitHub repository from `EasyApply` to
   `applikon`, relying on the automatic redirect for old links, then deploy and
   verify `aplikujbezspiny.pl` end to end.

Tests run once, after step 4.

**The logo image is untouched** — the briefcase graphic, colours, font and shape
all stay. The only change is the wordmark text, so `logo-trim.png` and
`logo_white.png` are regenerated with the new text in an identical layout.

**The tagline** lives on the landing page, the README and the OG meta, plus under
the logo on the login page — but never in the authenticated app UI. The login
page stacks two elements: a small uppercase kicker `— APLIKUJ BEZ SPINY! —` with
side dashes in the brand gradient, keyed by `tagline`, and below it a grey
gradient headline keyed by `login.headline`. Both translate normally: PL
*"Aplikuj bez spiny!"* and *"Zarządzaj swoją rekrutacją"*, EN *"Apply, no
stress!"* and *"Manage your recruitment"*.

## 3. Out of scope

- **Database schema, table and column names.** Nothing is renamed.
- **The API contract** — endpoints and request or response shapes.
- **The JWT signing key and the OAuth client IDs.**
- **The production domain** `aplikujbezspiny.pl`.
- **A logo redesign.** Only the wordmark text changes.
- **A favicon redesign.** `favicon.svg` stays as it is.
- **Feature changes, bug fixes and unrelated refactors.**
- **Rewriting historical commit messages or the git log.**

## 4. Done when

- Searching the repository for `easyapply`, case-insensitive, returns zero
  matches outside `.git/`, `node_modules/` and `target/`.
- Backend `./mvnw test` passes after the package rename.
- Frontend `npm run lint && npm run test:run && npm run build` all pass.
- `docker-compose up` starts the services under their new names.
- `aplikujbezspiny.pl` loads with the new logo and title.
- The GitHub repository is renamed to `applikon`.
