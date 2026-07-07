# Applikon — Privacy & RODO (preparation for publication)

## 1. Context

The application will be published publicly as a **portfolio project** —
presented on LinkedIn as a "real, working product" that recruiters and visitors can use.
No monetization, no marketing, no data sales. Goal: **demonstrate engineering maturity**, not build a SaaS.

This context determines the approach: **minimum credible RODO compliance**
with maximum risk reduction for personal data storage.

---

## 2. Problem

Currently, the application:

1. **Stores user personal data in the database** (`users`: email, name, google_id,
   refresh_token) after each Google login — without consent, without privacy policy,
   without ability to delete account.
2. **Hosts CV files** on the server (`uploads/cv/` + metadata in `cvs` table).
   CV as a document contains broad PII: address, phone, birth date,
   often a photo, employment history, education.
3. **No retention** — data is kept indefinitely, even for inactive users.

Each of these points creates RODO obligations. In current form, publishing
the project = knowingly exposing yourself to legal risk without any safeguards.

---

## 3. Architectural Decision

**CV only as external link (Google Drive / Dropbox / own site),
without uploading files to our server.**

This solution reduces the heaviest data (CV file with PII) from our
infrastructure, keeping the feature working — user pastes a link to their
CV hosted elsewhere and manages access themselves. Our database then contains:
email + name + google_id + link — data comparable to a public
LinkedIn profile.

We already have `CVType.LINK` alongside `CVType.FILE`, so the change
comes down to disabling the FILE path (backend rejects upload, frontend
blocks action).

**Important:** the "Upload PDF" button **remains visible in UI**, but disabled with
tooltip "Temporarily unavailable" — we preserve feature visibility in portfolio,
signaling that the feature exists as a fully implemented function in code.

---

## 4. Scope

Three logically independent threads, each with its own implementation plan:

### 4.1. `cv-link-only/` — transition to link-only
- Backend: block PDF upload endpoint (503 / message)
- Frontend: upload button disabled + tooltip, link path fully functional
- Decision on existing `CVType.FILE` records in database (read-only? migration? — to be decided in plan)

### 4.2. `rodo-minimum/` — RODO legal minimum
- `/privacy` page with privacy policy (PL + EN)
- Consent "I have read the privacy policy" on first login
- `DELETE /me` endpoint deleting user + all their data cascadingly
- "Delete account" button in UI (in profile settings) with confirmation
- Contact email for data matters in policy + footer

### 4.3. `retention-hygiene/` — retention and data hygiene
- Cron auto-deleting inactive accounts > 12 months
- Audit logs (MDC, loggers) for email/name/tokens leaks in plaintext
- Encryption or hashing of `refresh_token` in database (to be decided in plan)

---

## 5. Out of Scope

Consciously **not** entering:

- **DPO (Data Protection Officer)** — not required for project scale
- **DPIA (impact assessment)** — not required for scale and data type
- **Data Processing Register** — realized as README section, not formal document
- **End-to-end CV encryption** (variant C) — rejected in section 3
- **External audit / certification / ISO** — disproportionate to scale
- **Cookie consent banner** — application doesn't use tracking or advertising cookies, only technical (session)
- **Right to data portability** (`GET /me/export`) — considered optional, outside MVP of this topic
- **Multi-language privacy policy beyond PL/EN** — two versions only
- **Migration of existing CV files to elsewhere** — resolved per user by account deletion

---

## 6. Success Criteria (Definition of Done)

`07-privacy-rodo` is closed when:

1. ✅ UI doesn't allow uploading CV file (disabled + tooltip), can still add link
2. ✅ `/privacy` page publicly available, contains all required sections (who, what, why, how long, user rights, contact)
3. ✅ New user on first login must accept policy — without it, no database entry
4. ✅ Logged-in user can delete their account with one click; after deletion, no trace of them in database (user, cv, notes, applications)
5. ✅ Job runs periodically and deletes accounts inactive > 12 months
6. ✅ Production logs don't contain emails / user names / tokens in plaintext
7. ✅ README section "Privacy & Data" describes conscious architectural decisions
8. ✅ `as-built.md` updated: new endpoints, CV flow, `/privacy` page

---

## 7. Implementation Order

Suggested order (each step independently committable):

1. **`cv-link-only/`** — cheapest win, immediately reduces risk
2. **`rodo-minimum/`** — most work, but necessary before publication
3. **`retention-hygiene/`** — closure, can be done post-publication beta

---

## 8. Related Documents

- `spec/v1/1.0.0/as-built.md` — update after each thread
- `README.md` — "Privacy & Data" section after this topic completes
- `spec/README.md` — add row for 07-privacy-rodo
- `spec/v1/1.0.0/07-privacy-rodo/cv-link-only/` — plans for CV link-only (backend + frontend)
- `spec/v1/1.0.0/07-privacy-rodo/rodo-minimum/` — plans for RODO + policy content (backend + frontend + privacy-policy.md)
- `spec/v1/1.0.0/07-privacy-rodo/retention-hygiene/` — plan for retention and log audit

---

*Created: 2026-04-22*
