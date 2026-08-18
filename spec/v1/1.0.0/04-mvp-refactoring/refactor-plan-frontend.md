# 1.0.0 04-mvp-refactoring — Refactor Plan (frontend)

Remediation of the frontend findings from
[`03-mvp-review`](../03-mvp-review/mvp-code-review.md). Ten items, from an XSS
hole in rendered links down to a 987-line component. This plan works through the
frontend in ten passes; the fixes land in five of them, the rest are orientation
over an area before touching it.

For the component layout and routes as they exist now, read
[`architecture.md`](../../../architecture.md).

## Findings and status

Source: `03-mvp-review/mvp-code-review.md`.

### Critical (security / correctness)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-2 | Missing URL validation (XSS through href) | `ApplicationDetails.tsx`, `CVManager.tsx` | 9 | ✅ | ✅ |
| CR-3 | Refresh token contract (`token` vs `accessToken`) | `api.ts` + backend controller | 7 | ✅ | ✅ |
| CR-4 | Hardcoded `http://localhost:8080` in LoginPage | `LoginPage.tsx` | 7 | ✅ | ✅ |
| CR-5 | Missing SameSite on refresh_token cookie | `OAuth2AuthenticationSuccessHandler.java` | 8 | ✅ | ✅ |
| CR-6 | Missing Error Boundary + crash `new URL()` in CVManager | `App.tsx`, `CVManager.tsx` | 8 | ✅ | ✅ |

### Important (quality / consistency)

| ID | Problem | File(s) | Step | Status | Tested |
|----|---------|---------|-------|--------|--------|
| CR-7 | CVManager uses useState instead of useCV() | `CVManager.tsx` | 5 | ✅ | ✅ |
| CR-8 | Duplicate status color constants | `ApplicationDetails.tsx`, `ApplicationTable.tsx` | 9 | ✅ | ✅ |
| CR-9 | `apiFetch()` redirect without stopping processing | `api.ts` | 7 | ✅ | ✅ |
| CR-11 | Missing memoization for sort/filter | `ApplicationTable.tsx` | 3 | ✅ | ✅ |
| CR-12 | KanbanBoard.tsx ~987 lines — needs decomposition | `KanbanBoard.tsx` | optional | ✅ | ✅ |

**Legend:**
- **Status** ⬜/✅ — code change done
- **Tested** ⬜/✅ — tests passed and the change was verified in the browser

## Step 1 — Ecosystem and tools

No code change. An orientation pass over `package.json`, `vite.config.ts`,
`main.tsx` and `App.tsx` to see how the project is built and served.

**Checklist**
- [x] Build and entry points mapped

## Step 2 — Components

No code change. An orientation pass over how the components are composed, before
the passes that change them.

**Checklist**
- [x] Component tree mapped

## Step 3 — State and re-rendering

**Build**
- CR-11 — `ApplicationTable` sorts and filters on every render, with no
  memoisation. With a few hundred applications that is real work repeated for
  nothing. Wrap it in `useMemo`.

**Checklist**
- [x] CR-11 — sort and filter memoised

## Step 4 — Hooks

No code change. An orientation pass over the custom hooks (`useApplications`,
`useCV`, `useNotes`, `useBadgeStats`) before reworking the one that does not use
them.

**Checklist**
- [x] Hook inventory mapped

## Step 5 — React Query

**Build**
- CR-7 — `CVManager` fetches with `useState + useEffect + fetchCVs()` while the
  rest of the app uses React Query, so it misses caching and invalidation and
  behaves differently from every other list. Move it onto the existing `useCV()`
  hook.

**Checklist**
- [x] CR-7 — `CVManager` moved onto React Query

## Step 6 — Routing and page protection

No code change. An orientation pass over `ProtectedRoute` and the route table,
which sets up the Error Boundary work in Step 8.

**Checklist**
- [x] Routes and guards mapped

## Step 7 — Frontend to backend communication

**Build**
- CR-3 — token contract. The backend returns `"token"`, `api.ts:71` reads
  `"accessToken"`. Refresh therefore never worked and the user was logged out
  instead of renewed. Fix both ends.
- CR-4 — `LoginPage.tsx` has `http://localhost:8080` hardcoded, which breaks the
  moment the app is deployed anywhere. Move it to a Vite environment variable
  (`import.meta.env`) and add the name to `.env.example`.
- CR-9 — `apiFetch()` redirects on 401 but carries on processing the response
  afterwards instead of stopping.

**Checklist**
- [x] CR-3 — token field aligned
- [x] CR-4 — backend URL out of the source
- [x] CR-9 — redirect stops processing

## Step 8 — OAuth2 and JWT, end to end

**Build**
- CR-5 — `SameSite` missing on the refresh-token cookie, so the browser sends it
  on cross-site requests. Fixed on the backend, in
  `OAuth2AuthenticationSuccessHandler.java`.
- CR-6 — no Error Boundary, so any component that throws takes the whole page
  down with a white screen. Add one in `App.tsx`, and stop `new URL()` in
  `CVManager` from throwing on a malformed link.

**Checklist**
- [x] CR-5 — SameSite on the cookie
- [x] CR-6 — Error Boundary, and no crash on a bad URL

## Step 9 — TypeScript

**Build**
- CR-2 — URL validation. A stored link rendered straight into an `href` can be
  `javascript:`, which is stored XSS. Write an `isSafeUrl()` helper and use it in
  `ApplicationDetails.tsx` and `CVManager.tsx`.
- CR-8 — the status colours are duplicated in two components. Extract them to
  `src/constants/` so there is one source.

**Checklist**
- [x] CR-2 — URL validation before render
- [x] CR-8 — status colours deduplicated

## Step 10 — Tests

**Build**
- Vitest coverage for the fixed paths, plus Cypress E2E through `data-cy`
  selectors so the tests do not depend on the interface language.

**Checklist**
- [x] Tests added for the fixes from Steps 3 to 9
- [x] `npm run test:run` and `npm run build` green

## Optional — KanbanBoard decomposition

**Build**
- CR-12: `KanbanBoard.tsx` was around 987 lines with modals and hooks nested
  inside it. Split into separate files.

**Checklist**
- [x] CR-12 — `KanbanBoard` decomposed
