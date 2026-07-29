# 1.1.0 — Landing Page

## 1. Problem

The application is published and promoted on LinkedIn as a portfolio project.
Today a visitor opens the URL and is redirected straight to `/login`, where there
is a logo, a tagline and a "Sign in with Google" button — and nothing else.

The feedback from LinkedIn was direct:

> "You should make a HomePage/landing page roughly describing the app, problems
> it solves, features — some sneak peek of what's inside, because you enter the
> link and immediately have to log in via Google without knowing what for."

Three things are wrong with that entry point.

**There is no context before login.** A visitor sees a login button with no
explanation of what the app does, what problem it solves, or why they should hand
over their Google account.

**The privacy policy is unreachable.** `/privacy` exists, but no path leads to it
from the login screen, so the user cannot make an informed consent decision until
after they have registered.

**Conversion is zero.** Without context, visitors leave instead of logging in.

## 2. Solution

**A new public route `/` rendering a `LandingPage`.** It is static, public and
needs no auth. Today `/` redirects to `/dashboard`, which in turn redirects to
`/login` when nobody is signed in. Instead:

- an unauthenticated visitor on `/` sees the landing page,
- an authenticated user on `/` is still redirected to `/dashboard`,
- `/login` stays a valid route. Whether it aliases the landing page or stands
  alone is resolved in the plan.

Frontend only, no backend change. The sections, responsive on desktop and mobile:

- **Nav** — logo, language switcher, privacy policy link.
- **Hero** — headline, a subtitle stating the problem, the Google login call to
  action, and a trust note linking the privacy policy.
- **App preview** — a screenshot of the Kanban board.
- **Features** — three cards: Kanban board, list view, CV manager.
- **Footer CTA** — a second login button and a privacy policy link.

**The preview is a real screenshot**, supplied as a PNG in `public/`, not a
hardcoded HTML mock. That is the standard pattern for production SaaS products
such as Notion, Linear and Vercel, and a static `<img>` has no runtime dependency
on app state.

All text is translated PL and EN, consistent with the existing
`src/i18n/locales/` structure. On mobile the nav collapses, the hero stacks into
one column with the text above the screenshot, the feature cards stack, and the
screenshot goes full width with a capped height and `object-fit: contain`.

## 3. Out of scope

- **Backend changes.** None are needed.
- **Animations and scroll effects.** Static CSS only, no JS animation libraries.
- **A video demo.** The screenshot is enough.
- **A/B testing.** One layout.
- **Analytics and tracking.** No new tracking pixels.
- **Removing the `/login` route.** It stays; that is a separate decision.
- **Changes to `LoginPage.tsx`.** Untouched in this topic.

## 4. Done when

- An unauthenticated visitor on `/` sees the landing page, not a login form.
- An authenticated user on `/` is redirected to `/dashboard`.
- The privacy policy link is visible **before** any login prompt.
- The "Sign in with Google" button is present and works.
- The real Kanban screenshot shows in the preview section.
- The page is responsive on mobile (≤768px) and desktop (≥1024px).
- All text exists in PL and EN, and the language switcher works.
