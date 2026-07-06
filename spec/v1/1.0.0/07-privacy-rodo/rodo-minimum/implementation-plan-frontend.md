# RODO Minimum Implementation Plan — Applikon Frontend

## Work Process (applicable to each phase)

1. **Implementation** — Claude makes code changes
2. **Automatic verification** — `npm run build` + `npm run test:run`, both must be green
3. **Manual verification** — user runs `npm run dev` and verifies visually
4. **Update plans** — Claude updates checkboxes in this file
5. **Commit suggestion** — Claude proposes commit message (format: `type(frontend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue question** — Claude asks if we proceed to the next phase

---

## Goal

Build RODO frontend layer:
1. **Page `/privacy`** — publicly available, contains policy content (PL/EN)
2. **Consent screen** — blocks app UI for logged-in user without accepted policy
3. **Handle `403 CONSENT_REQUIRED`** from backend — redirect to consent screen
4. **Delete account button** — in profile / settings screen with confirmation
5. **Link to `/privacy`** + contact email in app footer

---

## Implementation Status

### Phase 1 — Route `/privacy` + Static Component

**New file:** `src/pages/PrivacyPolicy.tsx`

- [x] Create a component rendering policy content from markdown / inline
- [x] Content source: `src/content/privacyPolicy.ts` (imported as constants)
- [x] Language selection based on current `i18n.language` (PL/EN)
- [x] Styling consistent with rest of app (headings, section list)
- [x] Public page — **accessible without login**
- [x] react-markdown for markdown rendering

**Router:**

**File:** `src/App.tsx`

- [x] Add route `<Route path="/privacy" element={<PrivacyPolicy />} />`
- [x] Route is not wrapped in `ProtectedRoute`
- [x] `npm run build` green ✅

**Decision on content source:** simplest approach is to keep markdown as **string
constant in TS file** (e.g., `src/content/privacyPolicy.ts` with exports
`privacyPolicyPl` and `privacyPolicyEn`). Render via
`react-markdown` if available in the project, or manually split into JSX sections.
To be decided during implementation.

---

### Phase 2 — `User` Type in API Client Extended with `privacyPolicyAcceptedAt`

**File:** `src/types/domain.ts`

- [x] Add field `privacyPolicyAcceptedAt: string | null` to `User` type
- [x] `fetchCurrentUser()` returns type with this field
- [x] `npm run build` green ✅

---

### Phase 3 — Consent Screen `ConsentGate.tsx`

**New file:** `src/components/auth/ConsentGate.tsx`

- [x] Component wrapping the application (inside `ProtectedRoute`)
- [x] If `user.privacyPolicyAcceptedAt === null` → render full-screen consent screen
- [x] If accepted → `{children}` (i.e., normal app)

**Consent screen content:**
- [x] Heading: "Before you start" / "Zanim zaczniesz"
- [x] Brief description of acceptance requirement
- [x] Link to `/privacy` (opens in new tab)
- [x] Acceptance checkbox
- [x] "Accept and continue" button (disabled until checkbox checked)
- [x] "Log out" button — escape hatch
- [x] On click: `await api.acceptConsent()` → `window.location.reload()` → user sees app

**Location in component tree:**

```
<ProtectedRoute>
  <ConsentGate>
    <AppContent />   {/* normal app with Kanban, lists, etc. */}
  </ConsentGate>
</ProtectedRoute>
```

---

### Phase 4 — API Functions

**File:** `src/services/api.ts`

- [x] Add `acceptConsent(): Promise<void>` → `POST /api/auth/consent`
- [x] Add `deleteAccount(): Promise<void>` → `DELETE /api/auth/me`
- [x] clearToken() on deleteAccount ✅

---

### Phase 5 — Handle `403 CONSENT_REQUIRED` (optional)

**Decision:** **Skipped** — we rely on ConsentGate
- ConsentGate blocks UI earlier for users without consent
- 403 is an edge case (race condition) — sufficient to log to console

---

### Phase 6 — Settings page `/settings` with "Delete account" button

**New file:** `src/pages/Settings.tsx`

- [x] Add route `/settings` (protected)
- [x] "Account" section contains:
  - [x] User email (read-only)
  - [x] Privacy policy acceptance date (read-only, formatted)
  - [x] "Delete account" button (red, danger styling)
- [x] ⚙️ link in AppContent header
- [x] Confirm modal with warning
- [x] Field for typing "USUN" (PL) / "DELETE" (EN)
- [x] On confirm: deleteAccount() → alert → clear localStorage → redirect /login
- [x] Clear Applikon-specific flags (not all cookies) ✅

---

### Phase 7 — Footer

**New file:** `src/components/layout/Footer.tsx`

- [x] Component `<Footer />` visible on AppContent and Settings
- [x] Link "Privacy policy" / "Polityka prywatności" → `/privacy`
- [x] Contact email: `mailto:jakub.bone1990@gmail.com`
- [x] Minimal styling, consistent with rest of app ✅

**Email value:** to be determined, probably `jakub.bone1990@gmail.com`
(or separate "GDPR contact" email). Hardcoded / via env var.

---

### Phase 8 — i18n Keys

**Files:** `src/i18n/locales/pl/common.json`, `src/i18n/locales/en/common.json`

- [x] Keys to add (group semantically):
  - `consent.title` — "Zanim zaczniesz" / "Before you start"
  - `consent.description` — brief description of acceptance requirement
  - `consent.linkToPolicy` — "Przeczytaj politykę prywatności" / "Read privacy policy"
  - `consent.checkbox` — "Zapoznałem/am się z polityką prywatności i akceptuję ją" / "I have read and accept the privacy policy"
  - `consent.acceptButton` — "Akceptuję i kontynuuję" / "I accept and continue"
  - `consent.logoutButton` — "Wyloguj" / "Log out"
  - `settings.title` — "Ustawienia" / "Settings"
  - `settings.accountSection` — "Konto" / "Account"
  - `settings.privacyAcceptedAt` — "Zgoda na politykę: {{date}}" / "Policy consent: {{date}}"
  - `settings.deleteAccount.button` — "Usuń konto" / "Delete account"
  - `settings.deleteAccount.confirmTitle` — "Usunąć konto?" / "Delete account?"
  - `settings.deleteAccount.warning` — irreversibility warning
  - `settings.deleteAccount.confirmInputPrompt` — "Wpisz USUN aby potwierdzić" / "Type DELETE to confirm"
  - `settings.deleteAccount.confirmWord` — "USUN" (for PL) / "DELETE" (for EN)
  - `settings.deleteAccount.cancel` — "Anuluj" / "Cancel"
  - `settings.deleteAccount.confirm` — "Usuń moje konto" / "Delete my account"
  - `settings.deleteAccount.success` — "Twoje konto zostało usunięte" / "Your account has been deleted"
  - `footer.privacyLink` — "Polityka prywatności" / "Privacy policy"
  - `footer.contact` — "Kontakt" / "Contact"

- [x] `npm run build` green ✅

---

### Phase 9 — Tests

**Tests added:**

- [x] `PrivacyPolicy.test.tsx` (7 tests) — renders, headings, content, markdown formatting
- [x] `ConsentGate.test.tsx` (6 tests) — accepts, rejects, checkbox validation, API calls
- [x] `Settings.test.tsx` (8 tests) — renders, displays, delete flow, confirmation, error handling
- [x] `npm run test:run` — **89 passed, 0 failed** ✅

---

## Out of Scope

- **User data export (GET /me/export)** — beyond MVP for this phase
- **History of accepted policy versions** — single policy, no versioning
- **Cookie consent banner** — we don't use trackers, only technical session cookies
- **Terms of Service / ToS page** — separate document, out of scope for phase 07
- **Custom modal library** — we use existing components/patterns from project

---

## Files to Change / Add

| File | Status | Change |
|------|--------|--------|
| `pages/PrivacyPolicy.tsx` | **new** | Public page with policy content |
| `content/privacyPolicy.ts` | **new** | Policy content (PL + EN) as const |
| `components/auth/ConsentGate.tsx` | **new** | Wrapper blocking UI for users without consent |
| `pages/Settings.tsx` | **new** | Settings page with account deletion section |
| `components/layout/Footer.tsx` | **new** | Footer with policy link + contact |
| `App.tsx` | modify | Routes `/privacy`, `/settings`, wrapping in `ConsentGate` |
| `services/api.ts` | modify | `acceptConsent()`, `deleteAccount()`, `User` type with consent field |
| `i18n/locales/pl/*.json` | modify | Keys `consent.*`, `settings.*`, `footer.*` |
| `i18n/locales/en/*.json` | modify | Keys as above |
| `test/**` | modify | Mocks for `/me` with `privacyPolicyAcceptedAt` field |

---

## Definition of Done (DoD)

- [x] `/privacy` publicly available, displays policy in user's language (markdown rendering)
- [x] New user after login sees consent screen, doesn't reach main app
- [x] After clicking "Accept" user immediately sees normal app
- [x] Settings screen exists with "Account" section and "Delete account" button
- [x] Account deletion requires typing confirmation word, works end-to-end
- [x] Footer visible on all pages, contains policy link and contact email
- [x] `npm run build` green ✅
- [x] `npm run test:run` — 89 passed, 0 failed ✅
- [x] Manual verification: new user → login → consent screen → accept → app → settings → delete account → re-login → tour appears ✅

---

## Consent Flow Diagram

```
User logs in via Google
       ↓
Frontend receives JWT
       ↓
GET /api/auth/me → user.privacyPolicyAcceptedAt === null
       ↓
<ConsentGate> renders consent screen (UI blocked)
       ↓
User checks checkbox + clicks "Accept"
       ↓
POST /api/auth/consent → 204
       ↓
Invalidate queries /me → refetch
       ↓
user.privacyPolicyAcceptedAt = "2026-04-22T10:30:00Z"
       ↓
<ConsentGate> renders children (normal app)
```

---

*Last updated: 2026-04-23 — COMPLETE ✅*
