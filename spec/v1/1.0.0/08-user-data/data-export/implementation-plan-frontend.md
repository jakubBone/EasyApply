# Data Export Implementation Plan — Frontend

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

Add "Download my data" button in `/settings` that downloads
`applikon-export.json` file from backend. Fulfills RODO Art. 20 requirement.

---

## Implementation Status

### Phase 1 — API Function `exportMyData`

**File:** `src/services/api.ts` (or file with auth API calls in project)

- [x] Check how project passes auth token to `fetch`
  (interceptor, wrapper, headers directly) — adapt to existing pattern
- [x] Add `exportMyData` function:

```ts
export async function exportMyData(): Promise<void> {
  const response = await apiFetch('/api/auth/me/export'); // apiFetch = existing wrapper with token

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'applikon-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [x] `npm run build` green

---

### Phase 2 — Export Section in `Settings.tsx`

**File:** `src/pages/Settings.tsx`

- [x] Add local state:

```ts
const [exporting, setExporting] = useState(false);
const [exportError, setExportError] = useState(false);
```

- [x] Add handler:

```ts
async function handleExport() {
  setExporting(true);
  setExportError(false);
  try {
    await exportMyData();
  } catch {
    setExportError(true);
  } finally {
    setExporting(false);
  }
}
```

- [x] Add section in JSX (before "Delete account" section):

```tsx
<section>
  <h2>{t('settings.exportTitle')}</h2>
  <p>{t('settings.exportDescription')}</p>
  <button onClick={handleExport} disabled={exporting}>
    {exporting ? t('settings.exporting') : t('settings.exportButton')}
  </button>
  {exportError && <p className="error">{t('settings.exportError')}</p>}
</section>
```

Use existing CSS classes / Button components from project.

- [x] `npm run build` green

---

### Phase 3 — i18n Keys

**Files:** `src/i18n/locales/pl/common.json`, `src/i18n/locales/en/common.json`

- [x] Check structure of existing `settings.*` keys and match nesting level
- [x] Add keys (PL):

```json
"settings": {
  "exportTitle": "Twoje dane",
  "exportDescription": "Pobierz wszystkie swoje dane zapisane w Applikon.",
  "exportButton": "Pobierz moje dane",
  "exporting": "Przygotowuję...",
  "exportError": "Coś poszło nie tak. Spróbuj ponownie."
}
```

- [x] Add keys (EN):

```json
"settings": {
  "exportTitle": "Your data",
  "exportDescription": "Download all your data stored in Applikon.",
  "exportButton": "Download my data",
  "exporting": "Preparing...",
  "exportError": "Something went wrong. Try again."
}
```

- [x] `npm run build` green

---

### Phase 4 — Tests

**File:** `src/test/pages/Settings.test.tsx` (or equivalent in project)

- [x] Test: export section renders in `/settings`
- [x] Test: clicking button calls `exportMyData()`
- [x] Test: during download button is `disabled` with text "Przygotowuję..." / "Preparing..."
- [x] Test: when `exportMyData()` throws error — error message visible
- [x] Test: when `exportMyData()` succeeds — no error message
- [x] `npm run test:run` — all tests green

---

### Phase 5 — Manual Verification

```
1. npm run dev
2. Log in
3. Go to /settings
4. Check that "Twoje dane" / "Your data" section is visible
5. Click "Download my data"
6. Check that applikon-export.json file appears in Downloads folder
7. Open file — check it contains your applications and notes
8. Check that button was disabled during download (hard to notice
   on fast connection — can verify in DevTools → Network → Throttle)
```

---

## Definition of Done (DoD)

- [x] "Download my data" button visible in `/settings`
- [x] Clicking downloads `applikon-export.json` file
- [x] During download button is `disabled`
- [x] Error message appears on error
- [x] Translations work in PL and EN
- [x] `npm run build` green
- [x] `npm run test:run` — 0 failed

---

## Out of Scope

- **Preview of data in UI** — only file download, no displaying data in app
- **CSV export** — JSON only

---

## Files to Change

| File | Change |
|------|--------|
| `services/api.ts` | New function `exportMyData()` |
| `pages/Settings.tsx` | New section with export button |
| `i18n/locales/pl/common.json` | Keys `settings.export*` |
| `i18n/locales/en/common.json` | Keys `settings.export*` |
| `test/pages/Settings.test.tsx` | 5 new tests |
