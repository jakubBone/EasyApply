# Phase 14: Brand Rename to Applikon

## 1. Context

The project was originally named "EasyApply". The name conflicts with LinkedIn's
"Easy Apply" feature and an existing job tracker (applicotrack.com), which
weakens brand identity for a portfolio project. After a research pass on
alternatives, **Applikon** was chosen.

The Polish identity "Aplikuj bez spiny" stays on the `aplikujbezspiny.pl`
domain. The technical / English brand becomes Applikon.

---

## 2. Problem

- 545 occurrences of `EasyApply` / `easyapply` across 147 files.
- Java package `com.easyapply.*` is referenced in ~80 backend files.
- Two top-level folders (`easyapply-backend`, `easyapply-frontend`) drive paths
  in CI, docker-compose, and deployment docs.
- User-facing copy (privacy policy, login page, i18n bundles) still says
  EasyApply.

---

## 3. Decision

Full rename split into 4 commit-sized phases plus 1 external step.

**Key choices:**

- Java package: `com.easyapply` → `com.applikon` (IDE refactor → rename).
- Folders: `easyapply-{backend,frontend}` → `applikon-{backend,frontend}`.
- Logo: keep the current logo image as-is (briefcase graphic, colours, font,
  shape, all visual details). The **only** change is the wordmark text:
  `EasyApply` → `Applikon`. Regenerate `logo-trim.png` and `logo_white.png`
  with the new text but identical layout and styling.
- Tagline placement: lives on landing / README / OG meta, **plus** under
  the logo on the login page only — **not** in the authenticated app UI
  (decision revised 2026-05-10). The login page uses two stacked elements:
  a small uppercase kicker `— APLIKUJ BEZ SPINY! —` with side dashes
  (gradient brand colors) keyed by `tagline`, then a gray gradient headline
  `Zarządzaj swoją rekrutacją` (#666 → #555) keyed by `login.headline`.
  Both keys translate normally between PL and EN — PL: *"Aplikuj bez
  spiny!"* / *"Zarządzaj swoją rekrutacją"*; EN: *"Apply, no stress!"* /
  *"Manage your recruitment"*.
- Database: no schema or table rename.
- GitHub: rename repo `EasyApply` → `applikon` (auto-redirect handles old links).

**What we do NOT change:**

- Database schema, table, or column names.
- API contract (endpoints, request/response shapes).
- JWT signing key / OAuth client IDs.
- Production domain `aplikujbezspiny.pl`.

---

## 4. Scope

| Area | Change |
|------|--------|
| Backend Java | `com.easyapply` → `com.applikon`, main class, `pom.xml`, `application.properties`, OpenAPI title, JWT issuer |
| Frontend | `package.json`, `index.html`, logo component, OG meta, i18n bundles, privacy policy, code references, tests |
| Infra | `docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml`, `.claude/**` |
| Docs | `README.md`, `CLAUDE.md`, `SECURITY.md`, all `spec/**` |

---

## 5. Out of Scope

- Database schema or table renames.
- Logo redesign — image, colours, font, shape, and graphic details stay
  identical; only the wordmark text changes.
- Favicon redesign (`favicon.svg` stays as-is).
- Feature changes, bug fixes, or unrelated refactors.
- Rewriting historical commit messages or git log.

---

## 6. Success Criteria

Phase 14 is closed when:

1. ✅ Searching the repo for `easyapply` (case-insensitive) returns zero matches
   outside `.git/`, `node_modules/`, `target/`.
2. ✅ Backend `./mvnw test` passes after the package rename.
3. ✅ Frontend `npm run lint && npm run test:run && npm run build` pass.
4. ✅ `docker-compose up` starts services under the new names.
5. ✅ `aplikujbezspiny.pl` loads with the new logo and title.
6. ✅ GitHub repo renamed to `applikon`.
7. ✅ `spec/README.md` and `spec/v1/as-built.md` updated.

---

## 7. Implementation Order

Five steps, ordered to keep the build green at each commit.

1. **`refactor(backend): rename module and package to applikon`** —
   folder rename, Java package rename, main class, `pom.xml`,
   `application.properties`, OpenAPI title, JWT issuer.
2. **`refactor(frontend): rename module to applikon`** —
   folder rename, `package.json`, `index.html`, logo, OG meta, i18n bundles,
   privacy policy, code and test references.
3. **`chore(infra): rename services and paths to applikon`** —
   `docker-compose.yml`, `.env.example`, CI workflow, `.claude/**`.
4. **`docs(spec): rebrand from EasyApply to Applikon`** —
   `README.md`, `CLAUDE.md`, `SECURITY.md`, all `spec/**`.
5. **External (no commit)** — rename GitHub repo, deploy to Hetzner,
   verify `aplikujbezspiny.pl` end-to-end.

Tests run once after Phase 4 (per project convention).

---

## 8. Related Documents

- `spec/v1/1.0.0/14-rebrand-applikon/implementation-plan.md` — step-by-step actions.
- `spec/v1/as-built.md` — update after completion.
- `spec/README.md` — add row for phase 14.

---

*Created: 2026-05-10*
