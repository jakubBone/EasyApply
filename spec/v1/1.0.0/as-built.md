# 1.0.0 — As-Built

> Differences between plan and what shipped, with why. Source of truth: the code.
> Covers release 1.0.0 (topics 01-14) plus the post-release security cleanup.
> What exists now: [`../../architecture.md`](../../architecture.md) ·
> security flow: [`../security.md`](../security.md).

## 1. Plan vs reality

| Area | Planned | Built | Status |
|------|---------|-------|--------|
| Application CRUD | Basic REST API | Full CRUD + stage + duplicate check | As planned + more |
| Kanban view | 5 statuses | 4 DB statuses (SENT/IN_PROGRESS/OFFER/REJECTED), 3 columns (SENT/IN_PROGRESS/FINISHED) | Different |
| CV management | PDF upload + LINK + NOTE types (STEP 4) | LINK + NOTE; FILE upload disabled (07-privacy-rodo) | Modified |
| Notes | QUESTIONS/FEEDBACK/OTHER categories (STEP 5) | Implemented, categories renamed to English | As planned |
| Authentication | Not in MVP | Google OAuth2 + JWT + refresh tokens | Added beyond spec |
| Stage history | Planned | Implemented, then removed (V12) — overengineered | Removed |
| i18n (EN/PL) | Not in brief | i18next, detector, switcher, all strings | Added beyond spec |
| Badges / gamification | In plan (STEP 7) | StatisticsService + BadgeWidget | As planned |
| Enum values | Polish (WYSLANE, BRUTTO, …) | English (SENT, GROSS, …) | Renamed |
| Salary change auto-note | Planned (i18n plan) | `createSalaryChangeNote()` exists, never called | Dead code |
| Security: CORS | Separate `CorsConfig` | Merged into `SecurityConfig` | Different |
| DB migrations | Not planned (`ddl-auto=update`) | Flyway V1-V14, `ddl-auto=validate` | Added beyond spec |
| Privacy & RODO (07) | Not in MVP | `/privacy` page, consent flow, account deletion; retention-hygiene **deferred post-publication** | Added |
| User data (08) | Not in MVP | Data export (RODO Art. 20) + service notices (BANNER/MODAL, X-Admin-Key) | Added |
| Logging (10) | — | WARN on admin denials, failed refresh, 404 | As planned |
| Swagger (11) | — | Swagger UI + OpenAPI 3, JWT Bearer scheme | As planned |
| CI (12) + registry (13) | — | GitHub Actions (2 jobs) + GHCR images | As planned |
| Rebrand (14) | Full sweep EasyApply → Applikon | Done, except `V1__init_schema.sql` — editing an applied migration breaks the Flyway checksum | Modified |

## 2. Deviations — why

- **Enums renamed to English** (V5-V9): plan/brief used Polish values; English keeps
  code and DB consistent with the rest of the repo.
- **Kanban 5 → 3 columns**: ROZMOWA and ZADANIE merged into IN_PROGRESS (V3);
  FINISHED groups OFFER + REJECTED — fewer columns read better on one screen.
- **StageHistory removed** (V12): implemented per plan, but the UI never consumed
  it — dead complexity deleted (entity, repository, DTO, service methods).
- **CORS inside `SecurityConfig`**: Spring Security must handle CORS before auth
  checks, so a separate `CorsConfig` was architecturally wrong.
- **Flyway instead of `ddl-auto=update`**: versioned SQL beats Hibernate-managed
  schema for anything deployed.
- **Salary change auto-note = dead code**: `NoteService.createSalaryChangeNote()`
  is implemented and tested, but `ApplicationService.update()` never calls it.
- **`ApplicationRequest` has no `status` field** (intentional): status is `SENT` on
  create and changes only via dedicated PATCH endpoints.
- **retention-hygiene deferred**: minimum RODO is met; auto-delete of inactive
  accounts etc. moved past MVP publication (spec exists in
  `07-privacy-rodo/retention-hygiene/`).

## 3. Added beyond spec

- **Auth**: Google OAuth2 + JWT (RS256, 15 min) + refresh cookie; all queries scoped by `user_id`.
- **i18n EN/PL**: i18next (4 namespaces), `Accept-Language` on API calls, backend `MessageSource`.
- **Onboarding/tour**: `OnboardingOverlay`, `TourGuide`.
- **Demo application** created on first login.
- **React Query** instead of the brief's plain `fetch`.
- **Cypress E2E** with `data-cy` selectors.
- **Logout** (`POST /api/auth/logout`, separate topic in `05-additional-features/`).
- **Post-release security cleanup** (2026-05-08): `MdcUserFilter` → `observability/`,
  `ConsentRequiredFilter` → `@Component`, dead code removed; correlation ID
  intentionally skipped (overengineering for this scale).

## 4. Not implemented

| Item | Source | Notes |
|------|--------|-------|
| Salary change auto-note wiring | brief §5, i18n plan | Method exists in `NoteService`; `ApplicationService.update()` lacks the comparison + call |
| `rejectionDetails` in frontend `Application` type | — | Backend returns it; `domain.ts` doesn't declare it, so UI can't display it |
| retention-hygiene | `07-privacy-rodo/retention-hygiene/` | Deferred post-publication |
