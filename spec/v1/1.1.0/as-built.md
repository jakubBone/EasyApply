# 1.1.0 — As-Built

Source of truth is the code. What exists now:
[`architecture.md`](../../architecture.md).

Covers topic `15-landing-page`.

## 1. What shipped

`/` is now a public landing page instead of a redirect to the login form. An
unauthenticated visitor sees what the app does before being asked for their
Google account; an authenticated one is still redirected to `/dashboard`.

The page has a nav with the language switcher and a privacy policy link, a hero
with a rotating job-portal animation, a static preview of the Kanban board, three
feature cards, and a footer call to action. Everything is translated PL and EN
and is responsive down to mobile.

The privacy policy is now reachable **before** login, which is what makes the
consent decision an informed one.

Frontend only. No backend change.

## 2. Changed from plan

Nothing. The topic shipped as planned.
