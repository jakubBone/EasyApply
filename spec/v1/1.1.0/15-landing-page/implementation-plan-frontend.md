# Landing Page — Implementation Plan (Frontend)

## Work Process (applicable to each phase)

1. **Implementation** — Claude makes code changes
2. **Verification** — `npm run build` + `npm run test:run`, both must pass
3. **Manual verification** — user runs `npm run dev` and checks visually
4. **Update plan** — Claude updates checkboxes in this file
5. **Commit proposal** — Claude proposes commit message (`type(frontend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue** — Claude asks if we proceed to next phase

---

## Final Copy (approved in mockup)

**Hero headline:** Zarządzaj rekrutacją bez spiny

**Subtitle:**
> Wysyłasz CV na {rotating portal} i za tydzień nie wiesz co, gdzie i na jakim etapie?
> Applikon to Twoje centrum zarządzania rekrutacją w IT.

**Rotating portals:** LinkedIn, NoFluffJobs, Pracuj.pl, JustJoin.it, Bulldogjob, Rocket Jobs

**Feature cards (6):**
1. 🗂️ Wszystko w jednym miejscu — Aplikujesz na wielu jobboardach — wszystko trafia do jednego dashboardu. Koniec z przeskakiwaniem między portalami.
2. 📋 Kanban i etapy rekrutacji — Przeciągaj aplikacje między etapami — Wysłane, Rozmowa HR, Rozmowa techniczna. Jeden rzut oka i wiesz gdzie jesteś z każdą firmą.
3. 📝 Notatki, pytania i wynagrodzenie — Pytania z rozmów i Twoje odpowiedzi — wracasz do nich przed kolejną rozmową. I zawsze wiesz, jakie stawki proponowałeś.
4. 👤 Kontakty do rekruterów — Imię, email, LinkedIn rekrutera przy każdej aplikacji. Zawsze wiesz do kogo pisać.
5. 📂 Zarządzanie CV — Przypisuj wersje CV do aplikacji. Zawsze wiesz którą wersję wysłałeś i pod jakie ogłoszenie.
6. 🔗 Archiwum linków do ofert — Ogłoszenia wygasają — Applikon zapisuje je zanim znikną. Masz szczegóły zawsze pod ręką.

**Why Google cards (4):**
1. 🔒 Nie zostawiasz mi hasła — Applikon nigdy nie widzi Twojego hasła Google. Cały proces odbywa się na serwerach Google — dostaję tylko potwierdzenie "ten użytkownik jest zweryfikowany".
2. 🛡️ Co przechowuję? — W bazie danych trzymam tylko Twój adres email, imię i identyfikator Google. Nic więcej — żadnych haseł, żadnych tokenów płatniczych.
3. 📱 Twoje 2FA działa automatycznie — Masz włączone dwuetapowe uwierzytelnianie w Google? Chronisz też Applikon — bez żadnej dodatkowej konfiguracji z Twojej strony.
4. 👁️ Pełna kontrola dostępu — W ustawieniach Google widzisz wszystkie aplikacje z dostępem do Twojego konta. Możesz odwołać dostęp dla Applikon jednym kliknięciem, w każdej chwili.

**Page sections order:** Nav → Hero (gradient) → Co dostajesz → Logowanie przez Google → Footer CTA

---

## Implementation Status

### Phase 0 — Screenshot

- [x] User provides Kanban screenshot → replaced by static HTML Kanban mock (no screenshot needed)

> **Blocker:** phases 1–3 can be implemented without the screenshot.
> Phase 3 (Hero) uses `<img src="/screenshot-kanban.png" />` — visible only after Phase 0.

---

### Phase 1 — Routing

**File:** `src/App.tsx`

- [x] Import `LandingPage` from `./pages/LandingPage`
- [x] Replace `<Route path="/" element={<Navigate to="/dashboard" replace />} />` with `<Route path="/" element={<LandingPage />} />`
- [ ] Verify: unauthenticated user visiting `/` sees landing page
- [ ] Verify: authenticated user visiting `/` is redirected to `/dashboard`

---

### Phase 2 — i18n Keys

**Files:** `src/i18n/locales/pl/common.json`, `src/i18n/locales/en/common.json`

- [x] Add `landing` namespace section to both files:

```json
"landing": {
  "badge": "Darmowe · Bez rejestracji emailem",
  "headline1": "Aplikujesz wszędzie.",
  "headline2": "Masz to pod kontrolą.",
  "subtitlePart1": "Wysyłasz CV na",
  "subtitlePart2": "i nie wiesz już co gdzie i na jakim etapie? Applikon to",
  "subtitleAccent": "Twoje",
  "subtitlePart3": "centrum zarządzania rekrutacją dla kandydatów IT.",
  "ctaBtn": "Zaloguj się z Google — bezpłatnie",
  "ctaNote": "Nie masz konta? Zostanie utworzone automatycznie.",
  "privacyLink": "Polityka prywatności →",
  "featuresTitle": "Co dostajesz",
  "feat1Title": "Wszystko w jednym miejscu",
  "feat1Desc": "Aplikujesz na LinkedIn, NoFluffJobs, Pracuj.pl — Applikon zbiera to wszystko w jeden dashboard. Koniec z przeskakiwaniem między portalami.",
  "feat2Title": "Kanban i etapy rekrutacji",
  "feat2Desc": "Przeciągaj aplikacje między etapami — Wysłane, Rozmowa HR, Rozmowa techniczna. Jeden rzut oka i wiesz gdzie jesteś z każdą firmą.",
  "feat3Title": "Notatki, pytania i wynagrodzenie",
  "feat3Desc": "Zapisujesz pytania rekrutera, swoje odpowiedzi i co mówiłeś o zarobkach. Żadnych niespójności i żadnego \"co ja tam mówiłem\".",
  "feat4Title": "Kontakty do rekruterów",
  "feat4Desc": "Imię, email, LinkedIn rekrutera przy każdej aplikacji. Zawsze wiesz do kogo pisać.",
  "feat5Title": "Zarządzanie CV",
  "feat5Desc": "Przypisuj wersje CV do aplikacji. Zawsze wiesz którą wersję wysłałeś i pod jakie ogłoszenie.",
  "feat6Title": "Archiwum linków do ofert",
  "feat6Desc": "Ogłoszenia wygasają — Applikon zapisuje je zanim znikną. Masz szczegóły zawsze pod ręką.",
  "whyTitle": "Logowanie przez Google — jak to działa?",
  "why1Title": "Nie zostawiasz mi hasła",
  "why1Desc": "Applikon nigdy nie widzi Twojego hasła Google. Cały proces odbywa się na serwerach Google — dostaję tylko potwierdzenie \"ten użytkownik jest zweryfikowany\".",
  "why2Title": "Co przechowuję?",
  "why2Desc": "W bazie danych trzymam tylko Twój adres email, imię i identyfikator Google. Nic więcej — żadnych haseł, żadnych tokenów płatniczych.",
  "why3Title": "Twoje 2FA działa automatycznie",
  "why3Desc": "Masz włączone dwuetapowe uwierzytelnianie w Google? Chronisz też Applikon — bez żadnej dodatkowej konfiguracji z Twojej strony.",
  "why4Title": "Pełna kontrola dostępu",
  "why4Desc": "W ustawieniach Google widzisz wszystkie aplikacje z dostępem do Twojego konta. Możesz odwołać dostęp dla Applikon jednym kliknięciem, w każdej chwili.",
  "footerCta": "Gotowy żeby ogarnąć rekrutację?",
  "footerBtn": "Zacznij za darmo"
}
```

- [x] EN translations added to `en/common.json`:

```json
"landing": {
  "badge": "Free · No email registration",
  "headline1": "Apply everywhere.",
  "headline2": "Stay in control.",
  "subtitlePart1": "Sending CVs to",
  "subtitlePart2": "and losing track of what's where and at what stage? Applikon is",
  "subtitleAccent": "your",
  "subtitlePart3": "recruitment management hub for IT candidates.",
  "ctaBtn": "Sign in with Google — free",
  "ctaNote": "No account? One will be created automatically.",
  "privacyLink": "Privacy Policy →",
  "featuresTitle": "What you get",
  "feat1Title": "Everything in one place",
  "feat1Desc": "You apply on LinkedIn, NoFluffJobs, Pracuj.pl — Applikon pulls it all into one dashboard. No more jumping between portals.",
  "feat2Title": "Kanban & recruitment stages",
  "feat2Desc": "Drag applications between stages — Sent, HR Interview, Technical Interview. One glance and you know where you stand with every company.",
  "feat3Title": "Notes, questions & salary",
  "feat3Desc": "Log recruiter questions, your answers, and what you said about salary. No inconsistencies and no \"what did I say there?\".",
  "feat4Title": "Recruiter contacts",
  "feat4Desc": "Name, email, LinkedIn of the recruiter with every application. You always know who to write to.",
  "feat5Title": "CV management",
  "feat5Desc": "Assign CV versions to applications. You always know which version you sent and for which job posting.",
  "feat6Title": "Job link archive",
  "feat6Desc": "Job postings expire — Applikon saves them before they disappear. Details always at hand.",
  "whyTitle": "Sign in with Google — how does it work?",
  "why1Title": "You don't leave me your password",
  "why1Desc": "Applikon never sees your Google password. The entire process happens on Google's servers — I only receive confirmation \"this user is verified\".",
  "why2Title": "What do I store?",
  "why2Desc": "I only keep your email address, name, and Google ID in the database. Nothing more — no passwords, no payment tokens.",
  "why3Title": "Your 2FA works automatically",
  "why3Desc": "Have two-factor authentication enabled on Google? You're protecting Applikon too — with no extra configuration on your part.",
  "why4Title": "Full access control",
  "why4Desc": "In your Google settings you can see all apps with access to your account. You can revoke Applikon's access with one click, at any time.",
  "footerCta": "Ready to get your job search under control?",
  "footerBtn": "Start for free"
}
```

- [x] `npm run build` passes (TypeScript key types)

---

### Phase 3 — LandingPage Component

**New files:**
- `src/pages/LandingPage.tsx`
- `src/pages/LandingPage.css`

#### LandingPage.tsx structure

```
<div className="landing-page">
  <Nav />          ← logo + LanguageSwitcher + privacy link
  <Hero />         ← headline + subtitle + rotating portal + CTA + screenshot
  <Features />     ← 6 cards (3×2 grid)
  <WhyGoogle />    ← 4 cards (2×2 grid)
  <FooterCta />    ← second CTA button + privacy link
</div>
```

#### Checklist

- [x] `LandingPage.tsx` created
- [x] `LandingPage.css` created
- [x] Nav: logo (`/logo-trim.png`), `LanguageSwitcher`, link to `/privacy`
- [x] Hero: headline with gradient accent, subtitle with `<strong>Twoje</strong>`, rotating portal span
- [x] Rotating portal: `useState` + `useEffect` with `setInterval` cycling through 6 portals every 2s, fade+slide transition via CSS
- [x] CTA button: same Google SVG icon as `LoginPage.tsx`, same `handleGoogleLogin` logic
- [x] App preview: `<img src="/screenshot-kanban.png" alt="Podgląd Applikon" />` in browser-frame wrapper (dots + title bar)
- [x] Features section: 6 cards in 3×2 CSS grid, all text from i18n keys
- [x] Why Google section: 4 cards in 2×2 CSS grid, all text from i18n keys
- [x] Footer CTA: second login button + privacy policy link
- [x] Authenticated user → `<Navigate to="/dashboard" replace />`
- [x] Loading state → `return null` (same as LoginPage)

---

### Phase 4 — Mobile Responsive

**File:** `src/pages/LandingPage.css`

Breakpoint `@media (max-width: 768px)`:

- [x] Nav: hide privacy link text, keep as icon or abbreviation; language switcher stays
- [x] Hero: single column — text above screenshot
- [x] Screenshot: full width, `max-height: 280px`, `object-fit: cover`, `object-position: top`
- [x] Features grid: `grid-template-columns: 1fr` (stacked)
- [x] Why Google grid: `grid-template-columns: 1fr` (stacked)
- [x] CTA button: `width: 100%`
- [x] Footer CTA: adjust padding

- [ ] Manual verification on mobile viewport (DevTools 375px)

---

### Phase 5 — Tests

**New file:** `src/test/pages/LandingPage.test.tsx`

Pattern: same as `ProtectedRoute.test.tsx` — mock `useAuth` via `vi.mock`, render with
`<MemoryRouter initialEntries={['/']}><Routes><Route path="/" .../><Route path="/dashboard" .../></Routes></MemoryRouter>`.

- [x] `vi.mock('../../auth/AuthProvider')` — mock `useAuth`
- [x] Test: `isLoading=true` → renders null (no flash)
- [x] Test: `isAuthenticated=false` → landing page content visible (e.g. headline text)
- [x] Test: `isAuthenticated=true` → redirects to `/dashboard` (dashboard stub visible, landing content absent)
- [x] `npm run test:run` — 0 failed

> **Note:** `App.test.tsx` does not need changes — it tests `AppContent` (dashboard), not routing.

---

### Phase 6 — Cleanup & Docs

- [x] Remove `landing-mockup.html` from repo root (was a design tool only)
- [x] Update `spec/v1/as-built.md`: new route `/`, new component `LandingPage`, rotating portal animation
- [x] Update `spec/README.md`: add row for Phase 15

---

## File Structure

```
src/
  pages/
    LandingPage.tsx     ← new
    LandingPage.css     ← new
  i18n/
    locales/
      pl/common.json    ← add "landing" section
      en/common.json    ← add "landing" section
  App.tsx               ← routing change only
  test/
    pages/
      LandingPage.test.tsx  ← new (routing + auth-state tests)
public/
  screenshot-kanban.png ← provided by user (Phase 0)
```

---

## Definition of Done

- [x] Unauthenticated user at `/` sees landing page
- [x] Authenticated user at `/` redirects to `/dashboard`
- [x] Privacy policy link visible before any login prompt
- [x] Rotating portal name animates every 2 seconds
- [x] Screenshot visible in hero section (replaced by static Kanban mock)
- [x] All 6 feature cards visible
- [x] All 4 Why Google cards visible
- [x] PL/EN language switcher works on landing page
- [x] Responsive: mobile (375px) and desktop (1280px) verified
- [x] `npm run build` — no errors
- [x] `npm run test:run` — 0 failed (105/105)
- [x] `as-built.md` updated

---

*Created: 2026-05-28*
