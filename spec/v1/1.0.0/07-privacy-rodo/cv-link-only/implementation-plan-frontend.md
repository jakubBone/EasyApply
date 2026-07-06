# CV Link-Only Implementation Plan — Applikon Frontend

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

In "Add CV" modal the **"Upload PDF" option must remain visible**, but marked
as temporarily unavailable: card disabled, cursor `not-allowed`, tooltip on hover
"Temporarily unavailable". Click does not lead to upload screen.

Option **"CV Link"** works without changes. Existing CV files (if
in database) still display in the list, can be downloaded and deleted.

---

## Architectural Decisions
- **Code for step `addStep === 'file'` remains** — we don't remove upload logic or JSX.
  Only change: block entry to this step from selection screen.
- **Disabled card option, not hidden** — feature is visible in portfolio
  (shows implemented upload), but not clickable.
- **Tooltip via native `title` attribute** — no tooltip library to avoid
  introducing new dependency for this detail.
- **Mutation `useUploadCV` stays in code** — we don't remove it because backend won't call it (endpoint 503). Unused import would be flagged, so decision needed per-case (see Phase 3).

---

## Implementation Status

### Phase 1 — Disable "Upload PDF" Card in Add CV Modal

**File:** `applikon-frontend/src/components/cv/CVManager.tsx`

Currently card (line 406):
```tsx
<div className="add-cv-option" onClick={() => setAddStep('file')}>
```

- [x] Add `aria-disabled="true"` attribute and CSS class `add-cv-option--disabled` (skipped `data-disabled` — `aria-disabled` sufficient semantically and read by screen readers)
- [x] Remove `onClick` (removed, no no-op)
- [x] Add `title={t('cv.uploadDisabledTooltip')}` — native HTML tooltip
- [x] Show 🔒 icon instead of 📁 for clear visual signal
- [x] `npm run build` green

**Schema after change:**

```tsx
<div
  className="add-cv-option add-cv-option--disabled"
  data-disabled="true"
  title={t('cv.uploadDisabledTooltip')}
  aria-disabled="true"
>
  <div className="option-icon">📁</div>
  <div className="option-content">
    <h4>{t('cv.uploadOptionTitle')}</h4>
    <p>{t('cv.uploadOptionDesc')}</p>
    {/* features list unchanged */}
  </div>
</div>
```

---

### Phase 2 — CSS Styles for Disabled State

**File:** `applikon-frontend/src/components/cv/CVManager.css` (or appropriate style file — to verify)

- [x] Locate style file for `.add-cv-option` (found: `components/cv/CVManager.css`)
- [x] Add `.add-cv-option--disabled` rule:
  - `opacity: 0.5`
  - `cursor: not-allowed`
  - `:hover` reset (border and background unchanged)

**Schemat:**

```css
.add-cv-option--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-cv-option--disabled:hover {
  /* reset hover effects from regular card */
  transform: none;
  background: inherit;
}
```

---

### Phase 3 — i18n Keys for Tooltip

**Files:** `src/i18n/locales/pl/*.json`, `src/i18n/locales/en/*.json`

- [x] Locate file with `cv.*` keys (`i18n/locales/{pl,en}/common.json`)
- [x] Add key `cv.uploadDisabledTooltip`:
  - PL: `"Chwilowo niedostępne"` (editable by user)
  - EN: `"Temporarily unavailable"`
- [x] `npm run build` green

---

### Phase 4 — Handle 503 Error from Backend (Defensive) — SKIPPED

Per plan decision: we rely on `ConsentGate` / disabled UI. Endpoint
503 is unreachable through normal user flow, so dedicated handling
not needed. Existing `onError: alert(tErrors('cv.uploadError'))`
in `CVManager.tsx:87` covers any theoretical out-of-UI call.



**File:** `applikon-frontend/src/hooks/useCV.ts` or `src/services/api.ts`

Scenario: someone bypasses UI (e.g., DevTools) and calls `uploadCV` manually →
backend returns 503. Even though our UI doesn't initiate it, mutation
still available in code.

- [ ] Verify how `useUploadCV` currently handles errors (existing `onError` in `CVManager.tsx` line 87: `alert(tErrors('cv.uploadError'))`)
- [ ] Add error key `errors.cv.uploadDisabled` in both i18n files (PL/EN) —
      same message as backend returns
- [ ] **Decision to confirm during implementation**: whether to recognize 503 specially
      (e.g., different alert) or leave generic `cv.uploadError`. Recommendation:
      leave generic — this is edge case path, not worth complicating code.

---

### Phase 5 — Test Updates — N/A

**No `CVManager.test.tsx` file** in project (verified: `src/test/components/`
contains only `App.test.tsx` and `BadgeWidget.test.tsx`). `api.test.ts` tests
`uploadCV` function (mock fetch) — no changes needed, function signature is
the same, backend behavior is mocked.

- [x] Result `npm run test:run`: **68/68 green** (no regressions)

---

## Definition of Done (DoD)

- [x] "Upload PDF" card visible in modal but visually disabled (opacity, not-allowed cursor)
- [x] Mouse hover shows tooltip "Chwilowo niedostępne" / "Temporarily unavailable"
- [x] Clicking card doesn't open upload screen (no `onClick`)
- [x] Adding CV as LINK works as before (no changes in that path)
- [x] Existing FILE type CVs visible in list and can be downloaded / deleted (no changes)
- [x] `npm run build` without TypeScript errors
- [x] `npm run test:run` — 68/68, 0 failed
- [ ] Manual verification: full flow of adding CV via link works end-to-end with backend

---

## Out of Scope

- **Removing JSX for `addStep === 'file'` (dropzone, upload area)** — kept
  in case feature is restored
- **Removing `useUploadCV` hook and `uploadCV` function from `api.ts`** — kept
  as dead feature code
- **Custom tooltip component** — using native `title`, sufficient
- **Hiding existing FILE type CVs from list** — they remain visible
- **"Migrate your CV to Drive" info message** — optional, to be considered
  in `rodo-minimum/` phase (message in privacy policy)

---

## Files to Change

| File | Change |
|------|--------|
| `components/cv/CVManager.tsx` | Card upload disabled + tooltip, removed `onClick` |
| `components/cv/CVManager.css` (or appropriate) | Rule `.add-cv-option--disabled` |
| `i18n/locales/pl/*.json` | Key `cv.uploadDisabledTooltip` |
| `i18n/locales/en/*.json` | Key `cv.uploadDisabledTooltip` |
| `test/**/CVManager.test.tsx` | Assertion on `aria-disabled` and no navigation to file step |

---

## Flow Diagram After Changes

```
User clicks "Add CV"
       ↓
Modal with two options:
  ┌─────────────────┐   ┌─────────────────┐
  │ Upload PDF      │   │ Add Link        │
  │ (disabled)      │   │ (active)        │
  │ tooltip:        │   │                 │
  │ "Temporarily.." │   │                 │
  └────┬────────────┘   └────┬────────────┘
       │ click: no-op        │ click: setAddStep('link')
       ↓                     ↓
  (nothing happens)        Link paste screen
                              ↓
                           POST /api/cv (type: LINK)
                              ↓
                           CV added, modal closed
```

---

*Last updated: 2026-04-22*
