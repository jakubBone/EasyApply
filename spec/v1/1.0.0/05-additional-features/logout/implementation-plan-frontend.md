# Logout Implementation Plan — Applikon Frontend

## Work Process (applicable to each stage)

1. **Implementation** — Claude makes code changes
2. **Automatic verification** — `npm run build` + `npm run test:run`, both must be green
3. **Manual verification** — user runs `npm run dev` and verifies visually
4. **Update plans** — Claude updates checkboxes in this file
5. **Commit suggestion** — Claude proposes commit message (format: `type(frontend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue question** — Claude asks if we proceed to next stage

---

## Status

### Stage 1 — Connect backend to `signOut()`

**Problem:** `AuthProvider.signOut()` only clears localStorage and resets React state.
Does not call `POST /api/auth/logout`, so refresh token stays in database.

**File:** `src/auth/AuthProvider.tsx`

- [x] Import `logout` from `../services/api`
- [x] Change `signOut` to async function that calls `await logout()` before `clearToken()` + `setUser(null)`
- [x] Handle error (e.g., no network): despite backend error, clear token locally and log out user
- [x] `npm run test:run` green

**Scheme after change:**

```ts
const signOut = async () => {
  try {
    await logout()
  } catch {
    // Backend unreachable — log out locally anyway
  }
  clearToken()
  setUser(null)
}
```

> `api.ts` already exports `logout()` (line 63) — no need to write new function.

---

### Stage 2 — i18n keys for logout button

**Files:** `src/i18n/locales/pl/common.json`, `src/i18n/locales/en/common.json`

- [x] Add `auth.logout` key in both JSON files
- [x] `npm run build` green (TypeScript doesn't complain about unknown key)

**Keys:**

```json
// pl/common.json
"auth": {
  "logout": "Wyloguj"
}

// en/common.json
"auth": {
  "logout": "Log out"
}
```

> If `auth` section already exists in JSON files — add only `logout` key to existing object.

---

### Stage 3 — Logout button in header

**File:** `src/AppContent.tsx`

- [x] Import `useAuth` from `./auth/AuthProvider`
- [x] Get `signOut` and `user` from `useAuth()`
- [x] Add `Log out` button in `.header-right` (next to `LanguageSwitcher` and `BadgeWidget`)
- [x] Button calls `signOut()` on click
- [x] Button uses `t('auth.logout')` key
- [x] Add `data-cy="logout-btn"` attribute to button
- [x] `npm run build` green
- [ ] Manual verification: button visible in header, click logs out and redirects to login

**JSX scheme:**

```tsx
// header-right
<LanguageSwitcher />
<BadgeWidget />
<button
  data-cy="logout-btn"
  className="logout-btn"
  onClick={() => void signOut()}
>
  {t('auth.logout')}
</button>
```

> `void signOut()` — `signOut` is now `async`, `onClick` doesn't accept Promise, `void` suppresses TypeScript warning.

---

### Stage 4 — Update tests

**File:** `src/test/auth/AuthProvider.test.tsx`

Existing test `signOut` (line 83) only checks `clearToken`. After Stage 1, `signOut` also calls `api.logout`.

- [x] Add `logout: vi.fn()` to `vi.mock('../../services/api', ...)`
- [x] Update test `'signOut — clears token and resets user state to null'`:
  - `vi.mocked(api.logout).mockResolvedValue(undefined)` (happy path)
  - `expect(api.logout).toHaveBeenCalledOnce()`
  - `expect(api.clearToken).toHaveBeenCalled()` (as before)
- [x] Add test for backend error case:
  - `vi.mocked(api.logout).mockRejectedValue(new Error('network error'))`
  - After clicking `signOut` user is still logged out (`isAuthenticated: false`)
  - `clearToken` was still called
- [x] Change button text in test from `'Wyloguj'` to `'auth.logout'` (i18n key) or use `data-testid`
- [x] `npm run test:run` green

---

## Definition of Done (DoD)

- [x] `POST /api/auth/logout` is called on every logout
- [x] Despite network error, user is logged out locally
- [x] Button visible in header after login
- [x] i18n keys work in PL and EN
- [x] `npm run build` without TypeScript errors
- [x] `npm run test:run` — 0 failed tests
- [ ] Manual verification: clicking button logs out and shows login page

---

## Flow Diagram

```
User clicks "Log out"
       ↓
signOut() (AuthProvider)
       ↓
await api.logout()  →  POST /api/auth/logout  →  204
   (or error — ignored)
       ↓
clearToken()           (localStorage)
       ↓
setUser(null)          (React state)
       ↓
ProtectedRoute detects no user → redirect to /login
```

---

## Files to Change

| File | Change |
|------|--------|
| `src/auth/AuthProvider.tsx` | `signOut` calls backend before clearing state |
| `src/i18n/locales/pl/common.json` | Key `auth.logout` |
| `src/i18n/locales/en/common.json` | Key `auth.logout` |
| `src/AppContent.tsx` | Logout button in header |
| `src/test/auth/AuthProvider.test.tsx` | Mock `api.logout`, new assertions |

---

*Last update: 2026-04-07*
