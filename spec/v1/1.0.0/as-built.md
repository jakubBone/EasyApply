# 1.0.0 — As-Built

Source of truth is the code. What exists now:
[`architecture.md`](../../architecture.md) · security flow:
[`security.md`](../../security.md).

Covers topics 01 to 14, plus the post-release security cleanup.

## 1. What shipped

A job application tracker for Polish IT candidates, deployed on a Hetzner VPS
with `docker-compose`.

A user signs in with **Google OAuth2**. The backend exchanges the code, upserts
the user, and issues a JWT access token (RS256, 15 minutes) plus a refresh token
in a cookie. Every query is scoped by `user_id`, so no user can reach another's
data. On first login the user must accept the privacy policy before anything is
written; a demo application is created so the board is not empty.

**Applications** are the core. Full CRUD, with duplicate detection, a salary
field, a job-ad link and a rejection reason. Each carries **notes** in three
categories and **CV entries** of type LINK or NOTE. File upload exists in the
code but is disabled, because hosting CV files would mean hosting a document full
of personal data — topic 07 traded that away for a link.

The board is a **Kanban with three columns** — Sent, In progress, Finished —
over four database statuses, with drag and drop. There is also a list view and a
statistics widget with badges.

Everything is **bilingual, PL and EN**, through i18next on the frontend and
`MessageSource` on the backend, driven by `Accept-Language`.

For **privacy**, the user gets a public `/privacy` page, a one-click account
deletion that cascades through all their data, and a JSON export of everything
stored about them under RODO Article 20. An admin can post **service notices** as
a banner or a modal, secured by an `X-Admin-Key` header.

The schema is versioned with **Flyway**, migrations `V1` to `V15`, with
`ddl-auto=validate`. **Swagger UI** documents every endpoint and accepts a JWT so
authenticated calls can be tried from the browser. **GitHub Actions** runs
backend and frontend tests on every push to `main` and pushes both Docker images
to GHCR, which the server then pulls.

The project was renamed from EasyApply to Applikon in topic 14.

## 2. Changed from plan

| Where | Planned | Built | Why |
|-------|---------|-------|-----|
| Kanban | 5 statuses | 4 database statuses (SENT, IN_PROGRESS, OFFER, REJECTED) in 3 columns (SENT, IN_PROGRESS, FINISHED) | ROZMOWA and ZADANIE merged into IN_PROGRESS (`V3`), and FINISHED groups OFFER with REJECTED. Fewer columns read better on one screen |
| Enum values | Polish (WYSLANE, BRUTTO, …) | English (SENT, GROSS, …) | `V5`-`V9`. English keeps the code and the database consistent with the rest of the repo |
| CV management | PDF upload plus LINK and NOTE types | LINK and NOTE; FILE upload disabled | Topic 07 — a hosted CV is the heaviest personal data in the system |
| Stage history | Planned and implemented | Removed in `V12` | The UI never consumed it. Entity, repository, DTO and service methods deleted as dead complexity |
| Security: CORS | A separate `CorsConfig` | Merged into `SecurityConfig` | Spring Security must handle CORS before the auth checks, so a separate config was architecturally wrong |
| DB migrations | Not planned; `ddl-auto=update` | Flyway `V1`-`V15`, `ddl-auto=validate` | Versioned SQL beats a Hibernate-managed schema for anything deployed |
| Authentication | Not in the MVP | Google OAuth2, JWT, refresh tokens | Added beyond the original scope |
| i18n (EN/PL) | Not in the brief | i18next with 4 namespaces, a detector, a switcher, and every string | Added beyond the original scope |
| Privacy and RODO (07) | Not in the MVP | `/privacy`, consent flow, account deletion | Added beyond the original scope |
| User data (08) | Not in the MVP | Data export plus service notices | Added beyond the original scope |
| Data fetching | Plain `fetch` | React Query | Caching, retries and optimistic updates for free |
| Testing | Not specified | Cypress E2E with `data-cy` selectors | |
| Onboarding | Not planned | `OnboardingOverlay` and `TourGuide`, plus a demo application on first login | An empty board teaches nothing |
| Rebrand (14) | A full sweep of EasyApply to Applikon | Done, except `V1__init_schema.sql` | Editing an already-applied migration breaks the Flyway checksum |
| CI (12) | The workflow triggers on `master` | Triggers on `main` | The repository's default branch. The plan's YAML snippet still shows the older name |
| Post-release | — | Security cleanup: `MdcUserFilter` moved to `observability/`, `ConsentRequiredFilter` became a `@Component`, dead code removed | A correlation ID was deliberately skipped as overengineering at this scale |

## 3. Not done

| Item | Why not |
|------|---------|
| `retention-hygiene` (07) | The RODO minimum is met, so auto-deleting inactive accounts moved past publication. The plan is written and unexecuted in `07-privacy-rodo/retention-hygiene/` |
| Wiring the salary-change auto-note | `NoteService.createSalaryChangeNote()` is implemented and tested, but `ApplicationService.update()` never compares the old and new salary, so it is never called |
| `rejectionDetails` in the frontend | The backend returns it, but `domain.ts` does not declare it, so the UI cannot display it |

`ApplicationRequest` deliberately has no `status` field: an application is `SENT`
on creation and changes only through the dedicated PATCH endpoints.
