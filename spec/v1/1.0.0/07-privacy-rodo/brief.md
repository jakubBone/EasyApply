# 1.0.0 — Privacy and RODO

## 1. Problem

The application is about to be published as a **portfolio project**, presented on
LinkedIn as a real, working product that recruiters and visitors can use. There
is no monetisation, no marketing and no data selling. The goal is to demonstrate
engineering maturity, not to build a SaaS. That context sets the bar: **the
minimum credible RODO compliance**, with the largest possible reduction in
personal-data risk.

As it stands, the application does three things that create obligations:

1. It **stores personal data** in `users` — email, name, `google_id`,
   `refresh_token` — after every Google login, with no consent, no privacy
   policy, and no way to delete the account.
2. It **hosts CV files** on the server, in `uploads/cv/` with metadata in the
   `cvs` table. A CV carries broad personal data: address, phone number, date of
   birth, often a photo, plus employment and education history.
3. It has **no retention policy**. Data is kept indefinitely, including for
   inactive users.

Publishing in this state would mean knowingly taking on legal risk with no
safeguards.

## 2. Solution

**A CV is only an external link** — to Google Drive, Dropbox, or the candidate's
own site — with no file uploaded to our server.

That removes the heaviest data, a CV file full of personal information, from our
infrastructure while keeping the feature working: the user pastes a link to a CV
hosted elsewhere and controls access themselves. Our database then holds email,
name, `google_id` and a link, which is comparable to a public LinkedIn profile.

`CVType.LINK` already exists alongside `CVType.FILE`, so the change comes down to
disabling the FILE path: the backend rejects the upload and the frontend blocks
the action. The "Upload PDF" button **stays visible** but disabled, with a
"temporarily unavailable" tooltip. Keeping it visible shows in the portfolio that
the feature exists and is fully implemented in the code.

The work splits into three independent threads, each with its own plan:

- **`cv-link-only/`** — the backend blocks the upload endpoint, the frontend
  disables the button, and the link path stays fully functional. What happens to
  existing `CVType.FILE` rows is decided in the plan.
- **`rodo-minimum/`** — a `/privacy` page in PL and EN, a consent step on first
  login, a `DELETE /me` endpoint that cascades through all of the user's data, a
  "delete account" button with confirmation, and a contact address for data
  matters in the policy and the footer.
- **`retention-hygiene/`** — a scheduled job deleting accounts inactive for more
  than 12 months, an audit of logs and MDC for plaintext emails, names and
  tokens, and a decision on encrypting or hashing `refresh_token`.

The suggested order is cheapest-win first: `cv-link-only`, then `rodo-minimum`
before publication, then `retention-hygiene`, which can follow publication.

## 3. Out of scope

Deliberately not entered:

- **A Data Protection Officer.** Not required at this scale.
- **A data protection impact assessment.** Not required for this scale or data
  type.
- **A formal processing register.** Covered as a README section instead.
- **End-to-end CV encryption.** Rejected in favour of link-only.
- **External audit, certification or ISO.** Disproportionate.
- **A cookie consent banner.** The application uses no tracking or advertising
  cookies, only technical session ones.
- **The right to data portability** (`GET /me/export`). Optional, and outside
  this topic.
- **A privacy policy in more than PL and EN.**
- **Migrating existing CV files elsewhere.** Resolved per user by account
  deletion.

## 4. Done when

- The UI does not allow uploading a CV file, showing a disabled button with a
  tooltip, while adding a link still works.
- `/privacy` is publicly available and covers who, what, why, how long, the
  user's rights, and contact.
- A new user must accept the policy on first login. Without it there is no
  database entry.
- A logged-in user can delete their account in one click, and afterwards no trace
  of them remains in `users`, `cvs`, `notes` or `applications`.
- A job runs periodically and deletes accounts inactive for more than 12 months.
- Production logs contain no plaintext emails, user names or tokens.
- The README has a "Privacy & Data" section describing the deliberate
  architectural decisions.
