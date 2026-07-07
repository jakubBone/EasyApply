# Applikon — Landing Page

## 1. Context

The application is publicly published and promoted on LinkedIn as a portfolio project.
Current entry point: user visits the URL → immediate redirect to `/login`
with only a logo, tagline, and "Sign in with Google" button.

Feedback received on LinkedIn:

> "You should make a HomePage/landing page roughly describing the app,
> problems it solves, features — some sneak peek of what's inside,
> because you enter the link and immediately have to log in via Google
> without knowing what for."

The user has a Privacy Policy page at `/privacy`, but it is currently
unreachable before login — the user never sees it until after registering.

---

## 2. Problem

1. **No context before login** — visitor sees only a login button with no
   explanation of what the app does, what problem it solves, or why they
   should share their Google account.
2. **Privacy policy inaccessible** — `/privacy` exists but no path leads
   to it from the login screen; user can't make an informed consent decision.
3. **Zero conversion** — without context, visitors leave without logging in.

---

## 3. Architectural Decision

**New public route `/` — Landing Page.**

Currently `/` redirects to `/dashboard` (which redirects to `/login` if
unauthenticated). Instead, `/` will render a `LandingPage` component:
static, public, no auth required.

- Authenticated user visiting `/` → redirect to `/dashboard` (unchanged behavior)
- Unauthenticated user visiting `/` → sees the landing page
- `/login` remains as a valid route (aliased to landing, or standalone — resolved in plan)

**Screenshot approach for Kanban preview.**
The landing page shows a real screenshot of the Applikon UI (supplied by the user
as a PNG in `public/`) rather than a hardcoded HTML mock. This is the standard
pattern used by production SaaS products (Notion, Linear, Vercel).
The screenshot is a static `<img>` tag — no runtime dependency on app state.

---

## 4. Scope

**Frontend only.** No backend changes required.

### 4.1. Routing change
- `App.tsx`: `/` → `<LandingPage />` instead of `<Navigate to="/dashboard" />`

### 4.2. LandingPage component
Sections (desktop + mobile responsive):
- **Nav** — logo, language switcher, privacy policy link
- **Hero** — headline, subtitle (problem statement), Google login CTA, trust note with privacy policy link
- **App preview** — screenshot of Kanban board (`public/screenshot-kanban.png`)
- **Features** — 3 cards: Kanban board / List view / CV manager
- **Footer CTA** — second login button, privacy policy link

### 4.3. i18n
All text on the landing page translated PL + EN, consistent with existing
`src/i18n/locales/` structure.

### 4.4. Mobile responsiveness
- Nav: logo left, links collapse or stack
- Hero: single column (text above screenshot)
- Features: single column
- Screenshot: full width, capped height, `object-fit: contain`

---

## 5. Out of Scope

- **Backend changes** — none needed
- **Animations / scroll effects** — static CSS only, no JS animation libraries
- **Video demo** — screenshot only
- **A/B testing** — single layout
- **Analytics / tracking** — not adding new tracking pixels
- **Removing `/login` route** — kept as-is, separate decision
- **`LoginPage.tsx` changes** — untouched in this topic

---

## 6. Success Criteria (Definition of Done)

`15-landing-page` is closed when:

1. ✅ Unauthenticated user visiting `/` sees the landing page (not a login form)
2. ✅ Authenticated user visiting `/` is redirected to `/dashboard`
3. ✅ Privacy policy link visible on landing page **before** any login prompt
4. ✅ "Sign in with Google" button present and functional on landing page
5. ✅ Real Kanban screenshot visible in the app preview section
6. ✅ Landing page fully responsive: mobile (≤768px) and desktop (≥1024px)
7. ✅ All text available in PL and EN, language switcher works
8. ✅ `npm run build` passes without TypeScript errors
9. ✅ `npm run test:run` — 0 failed tests (routing tests updated)
10. ✅ `spec/v1/1.1.0/as-built.md` updated: new route, new component

---

## 7. Implementation Order

Single feature, frontend only — one implementation plan:

1. **`implementation-plan-frontend.md`** — routing + component + i18n + responsive + tests

---

## 8. Related Documents

- `spec/v1/1.1.0/as-built.md` — update after completion
- `spec/README.md` — add row for 15-landing-page
- `spec/v1/1.1.0/15-landing-page/implementation-plan-frontend.md` — step-by-step plan

---

*Created: 2026-05-28*
