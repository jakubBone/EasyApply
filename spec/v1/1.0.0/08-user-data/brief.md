# 1.0.0 — User Data and Service Notices

## 1. Problem

Topic 07 closed the minimum RODO compliance: the consent flow, the privacy
policy, and account deletion. Two things are still missing from that layer.

**There is no data export.** A user can delete their account but cannot download
what we hold about them — applications, notes, CV links. That is a gap against
RODO Article 20, deliberately left out of topic 07 as outside its scope.

**There is no channel to reach users.** Nothing can tell them about a maintenance
window, a regulatory change or an update without editing code and redeploying.

## 2. Solution

**Data export.** `GET /api/auth/me/export` returns everything we store about the
user as a JSON file: profile, applications with their fields, notes, and CV
links. It is reachable from `/settings` through a "Download my data" button that
saves `applikon-export.json`. No schema change is needed.

**Service notices.** A `service_notices` table, added by migration `V14`, holds
an entry with text in PL and EN, an expiry date and a type. The frontend reads
`GET /api/system/notices/active` and shows what is live. The admin manages
entries through `POST /api/admin/notices`.

There are two types:

- `BANNER` — a bar at the top of the UI, which the user can close.
- `MODAL` — a popup on entry requiring "OK", which does not come back once
  dismissed. The dismissal is remembered in `localStorage`.

The frontend gets `ServiceBanner` and `ServiceModal` components.

## 3. Out of scope

- **Push notifications and e-mail.** Notices are in-app only.
- **CSV export.** JSON only.
- **An admin dashboard in the UI.** The admin works through the API.
- **Export versioning.** One format.
- **Export encryption.** The file is unencrypted and downloaded over HTTPS.

## 4. Done when

- A logged-in user can download `applikon-export.json` from `/settings`, and it
  contains their profile and all applications with notes and CV links.
- The export never leaks another user's data.
- An admin can create an active notice through `POST /api/admin/notices`.
- An active `BANNER` is visible to every logged-in user at the top of the UI.
- An active `MODAL` shows on entry and does not return after "OK" in that
  session.
- Notices past their `expiresAt` are not returned by the public endpoint.
