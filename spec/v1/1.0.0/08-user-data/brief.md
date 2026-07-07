# Applikon — User Data & Service Notifications

## 1. Context

`07-privacy-rodo` closed minimum RODO compliance: consent flow, privacy policy,
account deletion. Two features are missing that complete this layer:

- **Data portability** — user can download everything we store about them.
  RODO Art. 20 requirement, consciously omitted from 07-privacy-rodo as "outside MVP".
- **Service notification system** — admin can display a message
  to all users (maintenance windows, regulatory changes, updates).

---

## 2. Problem

Currently:

1. **No data export** — user can only delete account, but cannot
   download their data (applications, notes, CV links). Gap in RODO Art. 20.
2. **No communication channel with users** — no mechanism to inform
   users about service changes without code modification and redeployment.

---

## 3. Architectural Decision

### Data Export

Endpoint `GET /api/auth/me/export` returns all user data as JSON file:
profile, list of applications with fields, notes, CV links. Available
from `/settings`.

### Notification System

Table `service_notices` — admin adds entry (text PL + EN, expiration date,
type). Frontend queries `GET /api/system/notices/active` and displays active
messages. Admin manages via `POST /api/admin/notices` (secured by ADMIN
role).

Notification types:
- `BANNER` — bar at top of UI, can be closed
- `MODAL` — popup on entry, requires "OK", doesn't return after closing
  (remembered in localStorage)

---

## 4. Scope

### 4.1. `data-export/` — user data export
- Backend: `GET /api/auth/me/export` → JSON with profile, applications, notes, CV
- Frontend: "Download my data" button in `/settings`, downloads `applikon-export.json`
- Flyway: no schema changes

### 4.2. `service-notices/` — service notification system
- Backend: `service_notices` table, admin + public endpoints
- Frontend: `ServiceBanner` + `ServiceModal`
- Flyway: migration V14 adds `service_notices` table

---

## 5. Out of Scope

- **Push notifications / email** — notifications only in-app
- **CSV export** — JSON only
- **Admin dashboard in UI** — admin manages via API
- **Export versioning** — single v1 format
- **Export encryption** — file unencrypted, user downloads over HTTPS

---

## 6. Success Criteria (Definition of Done)

`08-user-data` is closed when:

1. ✅ Logged-in user can download `applikon-export.json` from `/settings`;
   file contains profile, all applications with notes and CV links
2. ✅ Export doesn't leak data from other users
3. ✅ Admin can create active notice via `POST /api/admin/notices`
4. ✅ Active `BANNER` visible to every logged-in user at top of UI
5. ✅ Active `MODAL` displays on entry; after "OK" doesn't return in this session
6. ✅ Expired notices (past `expiresAt`) not returned by public endpoint
7. ✅ `as-built.md` updated: new endpoints, new table, new components

---

## 7. Implementation Order

1. **`data-export/`** — one endpoint + one button in UI, zero DB changes
2. **`service-notices/`** — Flyway migration + backend + two frontend components

---

## 8. Related Documents

- `spec/v1/1.0.0/as-built.md` — update after each thread
- `spec/README.md` — add row for 08-user-data
- `spec/v1/1.0.0/08-user-data/data-export/` — backend and frontend plans
- `spec/v1/1.0.0/08-user-data/service-notices/` — backend and frontend plans

---

*Created: 2026-04-26*
