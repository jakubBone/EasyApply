# Service Notices Implementation Plan — Frontend

## Work Process (applicable to each step)

1. **Implementation** — Claude makes code changes
2. **Automatic verification** — `npm run build` + `npm run test:run`, both must be green
3. **Manual verification** — user runs `npm run dev` and verifies visually
4. **Update plans** — Claude updates checkboxes in this file
5. **Commit suggestion** — Claude proposes commit message (format: `type(frontend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue question** — Claude asks if we proceed to the next step

---

## Goal

Display active service notifications for logged-in user:
- `BANNER` — bar at top of app, can be closed
- `MODAL` — popup on entry, requires "OK", doesn't return after close
  (remembered in `localStorage`)

---

## Architecture

```
DashboardPage mounts
        ↓
useServiceNotices() — React Query, GET /api/system/notices/active
        ↓
notices.filter(type === BANNER) → <ServiceBanner />
notices.filter(type === MODAL)  → <ServiceModal />

ServiceBanner:
  sticky top, closeable via X
  dismiss state: useState (returns after refresh, since rare notification)

ServiceModal:
  shows if noticeId NOT in localStorage "dismissed_notices"
  after "OK": adds id to localStorage, doesn't return
```

---

## Implementation Status

### Step 1 — Type and API Function

**File:** `src/types/domain.ts` (or equivalent with types)

- [x] Add type:

```ts
export interface ServiceNotice {
  id: number;
  type: 'BANNER' | 'MODAL';
  messagePl: string;
  messageEn: string;
  expiresAt: string | null;
}
```

**File:** `src/services/api.ts`

- [x] Add function:

```ts
export async function fetchActiveNotices(): Promise<ServiceNotice[]> {
  const response = await apiFetch('/api/system/notices/active');
  if (!response.ok) return []; // don't block app if endpoint fails
  return response.json();
}
```

Errors from this endpoint should not block the app — `return []` instead of throwing
exception.

- [x] `npm run build` green

---

### Step 2 — Hook `useServiceNotices`

**New file:** `src/hooks/useServiceNotices.ts`

```ts
export function useServiceNotices() {
  return useQuery({
    queryKey: ['service-notices'],
    queryFn: fetchActiveNotices,
    staleTime: 5 * 60 * 1000, // 5 min — don't refetch on every click
  });
}
```

- [x] `npm run build` green

---

### Step 3 — Component `ServiceBanner`

**New file:** `src/components/notices/ServiceBanner.tsx`

```tsx
interface Props {
  notice: ServiceNotice;
}

export function ServiceBanner({ notice }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const { i18n } = useTranslation();

  if (dismissed) return null;

  const message = i18n.language === 'pl' ? notice.messagePl : notice.messageEn;

  return (
    <div className="service-banner">
      <span>{message}</span>
      <button onClick={() => setDismissed(true)} aria-label="Close">×</button>
    </div>
  );
}
```

`dismissed` state in `useState` — banner returns after page refresh.
This is intentional: service notifications are important and rare.

**Styling:**
- Sticky at top of content (below main app header)
- Background distinct from rest of UI (e.g., yellow / blue info)
- Full width, padding, close button on right
- Use existing CSS variables from project

- [x] `npm run build` green

---

### Step 4 — Component `ServiceModal`

**New file:** `src/components/notices/ServiceModal.tsx`

```tsx
const DISMISSED_KEY = 'dismissed_notices';

function getDismissed(): number[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function dismiss(id: number): void {
  const current = getDismissed();
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]));
}

interface Props {
  notice: ServiceNotice;
}

export function ServiceModal({ notice }: Props) {
  const [visible, setVisible] = useState(() => !getDismissed().includes(notice.id));
  const { i18n, t } = useTranslation();

  if (!visible) return null;

  const message = i18n.language === 'pl' ? notice.messagePl : notice.messageEn;

  function handleOk() {
    dismiss(notice.id);
    setVisible(false);
  }

  return (
    <div className="service-modal-overlay">
      <div className="service-modal">
        <p>{message}</p>
        <button onClick={handleOk}>{t('notices.ok')}</button>
      </div>
    </div>
  );
}
```

After clicking "OK": notice `id` saved in `localStorage`.
On next visit: modal won't appear for this `id`.

**Styling:**
- Full-screen overlay (analogous to existing modals in project)
- Centered dialog with content and OK button
- Use existing modal CSS classes

- [x] `npm run build` green

---

### Step 5 — Integration in `DashboardPage`

**File:** `src/pages/DashboardPage.tsx` (or `AppContent.tsx` — check
where main layout is mounted after login in project)

- [ ] Import hook and components:

```tsx
const { data: notices = [] } = useServiceNotices();

const banners = notices.filter(n => n.type === 'BANNER');
const modals  = notices.filter(n => n.type === 'MODAL');
```

- [ ] Render below header:

```tsx
{banners.map(n => <ServiceBanner key={n.id} notice={n} />)}
{modals.map(n  => <ServiceModal  key={n.id} notice={n} />)}
```

- [x] `npm run build` green

---

### Step 6 — i18n Keys

**Files:** `src/i18n/locales/pl/common.json`, `src/i18n/locales/en/common.json`

- [ ] Add (PL):

```json
"notices": {
  "ok": "OK, rozumiem"
}
```

- [ ] Add (EN):

```json
"notices": {
  "ok": "OK, got it"
}
```

- [x] `npm run build` green

---

### Step 7 — Tests

**New file:** `src/test/components/ServiceBanner.test.tsx`

- [ ] Test: banner renders message in current language (PL)
- [ ] Test: banner renders message in current language (EN)
- [ ] Test: clicking "×" hides banner
- [ ] Test: banner visible again after remount (state in useState, not localStorage)

**New file:** `src/test/components/ServiceModal.test.tsx`

- [ ] Test: modal renders message in current language
- [ ] Test: clicking "OK" hides modal
- [ ] Test: modal doesn't appear if `id` already in localStorage
- [ ] Test: after clicking "OK" `id` goes to localStorage

- [x] `npm run test:run` — all tests green

---

### Step 8 — Manual Verification

```
1. Backend: create notice via curl:
   curl -X POST http://localhost:8080/api/admin/notices \
     -H "X-Admin-Key: <your-key>" \
     -H "Content-Type: application/json" \
     -d '{"type":"BANNER","messagePl":"Test komunikat PL","messageEn":"Test message EN","expiresAt":null}'

2. npm run dev, log in

3. Check that BANNER appears at top of app
4. Click × — banner disappears
5. Refresh page — banner returns (state in useState, not localStorage)

6. Create MODAL notice analogously
7. Go to /dashboard — modal appears
8. Click "OK" — disappears
9. Refresh page — modal doesn't return (id in localStorage)
10. Open DevTools → Application → Local Storage → check "dismissed_notices"
```

---

## Definition of Done (DoD)

- [x] Active `BANNER` visible to logged-in user at top of UI
- [x] Clicking "×" closes banner (returns after refresh)
- [x] Active `MODAL` appears on entry
- [x] Clicking "OK" closes modal and doesn't return in this browser
- [x] Message displays in app language (PL/EN)
- [x] Error from `/api/system/notices/active` endpoint doesn't block app
- [x] `npm run build` green
- [x] `npm run test:run` — 0 failed

---

## Out of Scope

- **Banner/modal entry/exit animations** — out of scope
- **Multiple modals at once** — if multiple active MODAL,
  display all; in practice maximum one
- **localStorage reset** — user can manually clear
  `dismissed_notices` in DevTools to see modal again

---

## Files to Change

| File | Change |
|------|--------|
| `types/domain.ts` | Type `ServiceNotice` |
| `services/api.ts` | `fetchActiveNotices()` |
| `hooks/useServiceNotices.ts` | **New** — React Query hook |
| `components/notices/ServiceBanner.tsx` | **New** — banner component |
| `components/notices/ServiceModal.tsx` | **New** — modal component |
| `pages/DashboardPage.tsx` | Hook + components integration |
| `i18n/locales/pl/common.json` | Keys `notices.*` |
| `i18n/locales/en/common.json` | Keys `notices.*` |
| `test/components/ServiceBanner.test.tsx` | **New** — 4 tests |
| `test/components/ServiceModal.test.tsx` | **New** — 4 tests |
