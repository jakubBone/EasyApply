# i18n Implementation Plan — Applikon Frontend

## Work Process (applicable to each phase)

1. **Implementation** — Claude makes code changes
2. **Automatic verification** — `npm run build` + `npm run test:run`, both must be green
3. **Manual verification** — user runs `npm run dev` and verifies visually
4. **Update plans** — Claude updates checkboxes in this file
5. **Commit suggestion** — Claude proposes commit message (format: `type(frontend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue question** — Claude asks if we proceed to the next phase

---

## Implementation Status

### Phase 0 — Preparation
- [x] Inventory string literals in components
- [x] Install packages: `i18next react-i18next`
- [x] Create directory structure `src/i18n/`
- [x] Configure `src/i18n/index.ts`
- [x] Import `i18n` in `main.tsx` (before React)
- [x] Verification: application works identically as before
- [x] Fill all JSON files (pl + en): `common`, `errors`, `badges`, `tour`

### Phase 1 — `errors` Namespace
- [x] `throw new Error(...)` from `api.ts` → i18n keys
- [x] `alert(...)` from `CVManager.tsx` → i18n keys
- [x] `throw new Error` from `AuthProvider.tsx` → i18n keys
- [x] `en/errors.json` translated
- [x] `api.test.ts` — assertions updated to keys

### Phase 2 — `common` Namespace (main UI)
- [x] `LoginPage.tsx`
- [x] `AppContent.tsx`
- [x] `NotesList.tsx` (partially — see Phase 2a)
- [x] `SalaryFormSection.tsx`
- [x] `EndModal.tsx`
- [x] `MoveModal.tsx`
- [x] `OnboardingOverlay.tsx`
- [x] `ApplicationCard.tsx`
- [x] `ApplicationDetails.tsx`
- [x] `ApplicationForm.tsx`
- [x] `ApplicationTable.tsx`
- [x] `CVManager.tsx`

### Phase 2a — Skipped Files (BUGFIX)
- [x] `ErrorBoundary.tsx` — hardcoded `"Something went wrong"`, `"Sorry"`, `"Refresh page"` → i18n
- [x] `NotesList.tsx` — hardcoded `"Just now"` and relative times → i18n

### Phase 3 — `badges` Namespace
- [x] `BadgeWidget.tsx` + `constants/` → `badges.json`
- [x] `BadgeWidget.test.tsx` updated
- [x] `badges.cy.ts` updated

### Phase 4 — `tour` Namespace
- [x] `TourGuide.tsx` → `tour.json`
- [x] Verify tour mobile and desktop

### Phase 5 — Cypress `data-cy`
- [x] Identify all `cy.contains(...)` on interactive elements
- [x] Add `data-cy` to React components
- [x] Migrate selectors in Cypress files
- [x] Full E2E suite passing

### Phase 6 — TypeScript Type Keys
- [x] `src/i18n/types.ts` with module declaration
- [x] `tsc --noEmit` without errors

### Phase 7 — Language Detector + Switcher
- [x] Install: `npm install i18next-browser-languagedetector`
- [x] Update `src/i18n/index.ts`:
  - Remove hardcoded `lng: 'pl'`
  - Add `LanguageDetector` plugin
  - `fallbackLng: 'en'`
  - `supportedLngs: ['pl', 'en']`
  - `detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }`
- [x] New component `src/components/LanguageSwitcher.tsx` (PL / EN buttons)
- [x] `AppContent.tsx` — LanguageSwitcher in header (next to BadgeWidget)
- [x] `LoginPage.tsx` — LanguageSwitcher visible before login
- [x] `api.ts` — add `Accept-Language: i18n.language` header in `getHeaders()`
- [x] CSS for switcher
- [x] `src/test/setup.ts` — `i18n.changeLanguage('pl')` for test environment
- [x] `npm run build` passing
- [x] `npm run test:run` passing
- [x] Manual verification: language change works immediately, persists after refresh

### Phase 7a — Stage Names i18n (recruitment stage names)

> Discovered during manual verification of Phase 7. Stages in the "In Progress" column
> did not translate on language change because they were stored as Polish strings in DB.

#### Architecture
- Predefined stages: DB stores **key** (`"stage.hrInterview"`), not display name
- Legacy data (Polish strings in DB): handled by `LEGACY_STAGE_MAP` — translated correctly without DB migration
- Custom stages (entered manually by user): stored as-is, displayed as-is — this is user data, not subject to translation

#### Files to Change

- [x] `src/i18n/locales/pl/common.json` — add `stage.*` section
- [x] `src/i18n/locales/en/common.json` — add `stage.*` section
- [x] `src/components/kanban/types.ts`:
  - Change `PREDEFINED_STAGES: string[]` → `PREDEFINED_STAGES: { key: string; labelKey: ParseKeys<'common'> }[]`
  - Add `LEGACY_STAGE_MAP: Record<string, string>` (map old name → key)
  - Add helper `translateStageName(name, t)` — translates key or legacy string, custom returns as-is
  - Add helper `normalizeStageKey(name)` — returns key regardless of format (for comparisons)
- [x] `src/components/kanban/StageModal.tsx` — full i18n migration + send `stage.key` instead of display name
- [x] `src/components/kanban/ApplicationCard.tsx`:
  - Display: `translateStageName(application.currentStage, t)`
  - Dropdown active check: `normalizeStageKey(application.currentStage) === stage.key`
  - Send: `stage.key` (not display name)
  - Application date: `i18n.language` instead of hardcoded `'pl-PL'`
- [x] `src/components/applications/ApplicationDetails.tsx`:
  - Display: `translateStageName(application.currentStage, t)`
  - `formatDate` and `formatSalary`: `i18n.language` instead of hardcoded `'pl-PL'`
- [x] `npm run build` passing
- [x] `npm run test:run` passing
- [x] Manual verification:
  - Predefined stages translate on language change
  - Old stages in DB (Polish strings) display correctly
  - Custom stages display as-is regardless of language
  - Selected (active) stage works correctly in dropdown

#### i18n Keys
```json
// pl/common.json
"stage": {
  "hrInterview": "Rozmowa z HR",
  "technicalInterview": "Rozmowa techniczna",
  "managerInterview": "Rozmowa z managerem",
  "recruitmentTask": "Zadanie rekrutacyjne",
  "finalInterview": "Rozmowa finalna",
  "modalTitle": "Wybierz etap rekrutacji",
  "customPlaceholder": "Inny etap...",
  "customAdd": "Dodaj",
  "cancel": "Anuluj"
}

// en/common.json
"stage": {
  "hrInterview": "HR Interview",
  "technicalInterview": "Technical Interview",
  "managerInterview": "Manager Interview",
  "recruitmentTask": "Recruitment Task",
  "finalInterview": "Final Interview",
  "modalTitle": "Select recruitment stage",
  "customPlaceholder": "Other stage...",
  "customAdd": "Add",
  "cancel": "Cancel"
}
```

#### Helpers w `types.ts`
```ts
// Maps legacy Polish DB values to i18n keys (backward compatibility — no DB migration needed)
export const LEGACY_STAGE_MAP: Record<string, string> = {
  'Rozmowa z HR':         'stage.hrInterview',
  'Rozmowa techniczna':   'stage.technicalInterview',
  'Rozmowa z managerem':  'stage.managerInterview',
  'Zadanie rekrutacyjne': 'stage.recruitmentTask',
  'Rozmowa finalna':      'stage.finalInterview',
}

// Returns display string for any stored value (key, legacy Polish, or custom text)
export const translateStageName = (name: string | null | undefined, t: TFunction): string => {
  if (!name) return ''
  if (name.startsWith('stage.')) return t(name as ParseKeys<'common'>)
  const mappedKey = LEGACY_STAGE_MAP[name]
  if (mappedKey) return t(mappedKey as ParseKeys<'common'>)
  return name // custom stage — show as-is
}

// Returns canonical key for comparisons (active state in dropdown)
export const normalizeStageKey = (name: string | null | undefined): string => {
  if (!name) return ''
  if (name.startsWith('stage.')) return name
  return LEGACY_STAGE_MAP[name] ?? name
}
```

### Phase 8 — Comments & Tests EN
- [x] Source code comments → English (`KanbanBoard.tsx`, `LoginPage.tsx`, `AuthCallbackPage.tsx`, `ProtectedRoute.tsx`)
- [x] `it()` in Vitest tests → English (`App.test.tsx`, `BadgeWidget.test.tsx`)
- [x] Comment in `cypress/support/e2e.ts` → English
- [x] `it()` in `cypress/e2e/application-crud.cy.ts` → English
- [x] `npm run test:run` passing

### Phase 9 — Rename Enum Values to English + i18n Key Cleanup

> **This phase is summary only.** Detailed step-by-step instructions, complete mappings
> of old→new enum values, list of changed files per-step, and execution history
> (with test results after each step) are in: `spec/i18n/enum-rename-plan.md`

#### Domain Types (`types/domain.ts`)
- [x] `ApplicationStatus` — `'SENT' | 'IN_PROGRESS' | 'OFFER' | 'REJECTED'`
- [x] `ContractType` — `'B2B' | 'EMPLOYMENT' | 'MANDATE' | 'OTHER'`
- [x] `SalaryType` — `'GROSS' | 'NET'`
- [x] `RejectionReason` — `'NO_RESPONSE' | 'EMAIL_REJECTION' | 'REJECTED_AFTER_INTERVIEW' | 'OTHER'`
- [x] `NoteCategory` — `'QUESTIONS' | 'FEEDBACK' | 'OTHER'`

#### Kanban

- [x] `kanban/types.ts` — `STATUSES` ids (`SENT`, `IN_PROGRESS`, `FINISHED`) and labelKeys (`kanban.statusSENT` etc.)
- [x] `kanban/types.ts` — `REJECTION_REASONS` ids and labelKeys (`kanban.rejectionNoResponse` etc.)
- [x] `kanban/KanbanBoard.tsx` — all status and rejection reason literals
- [x] `kanban/ApplicationCard.tsx` — literals `W_PROCESIE`/`OFFER`/`ODMOWA`
- [x] `kanban/EndModal.tsx` — `'OFERTA'`/`'ODMOWA'`/`'INNE'`
- [x] `kanban/MoveModal.tsx` — `'OFERTA'`/`'ODMOWA'`/`'ZAKONCZONE'`

#### Applications

- [x] `constants/applicationStatus.ts` — `STATUS_CONFIG` keys (`SENT`, `IN_PROGRESS`, `OFFER`, `REJECTED`), labelKeys (`statusConfig.SENT` etc.), removed legacy entries
- [x] `components/applications/ApplicationTable.tsx` — inline `contractKeys` map, `t()` for contractType; removed legacy statusConfig entries
- [x] `components/applications/ApplicationDetails.tsx` — `CONTRACT_TYPE_KEYS` map, `formatSalary` takes `t: TFunction`
- [x] `components/applications/SalaryFormSection.tsx` — `value="GROSS/NET"`, `value="EMPLOYMENT/MANDATE/OTHER"`, labels via `t()`
- [x] `components/applications/ApplicationForm.tsx` — default `'BRUTTO'` → `'GROSS'`

#### Notes

- [x] `components/notes/NotesList.tsx` — `CATEGORIES` values and labelKeys, `LEGACY_CATEGORY_MAP`, default `useState` `'PYTANIA'` → `'QUESTIONS'`, reset after save `'PYTANIA'` → `'QUESTIONS'`

#### i18n JSON (key cleanup + new keys)

- [x] `en/common.json` + `pl/common.json` — rename: `salary.brutto/netto` → `salary.gross/net`
- [x] `en/common.json` + `pl/common.json` — rename: `notes.catPytania/catInne` → `notes.catQuestions/catOther`
- [x] `en/common.json` + `pl/common.json` — rename: `kanban.rejectionBrak*` → `kanban.rejectionNoResponse` etc.
- [x] `en/common.json` + `pl/common.json` — added: `salary.contractB2B`, `contractEmployment`, `contractMandate`, `contractOther`
- [x] `en/common.json` + `pl/common.json` — removed: legacy `statusConfig.ROZMOWA/ZADANIE/ODRZUCONE`

#### Tests

- [x] `App.test.tsx`, `useApplications.test.tsx` — updated status assertions
- [x] `npm run test:run` — 67/67 ✅

---

## File Structure

```
src/
  i18n/
    index.ts                  ← i18next configuration + LanguageDetector
    types.ts                  ← TypeScript key typing
    locales/
      pl/
        common.json
        errors.json
        badges.json
        tour.json
      en/
        common.json
        errors.json
        badges.json
        tour.json
  components/
    LanguageSwitcher.tsx      ← new component (Phase 7)
```

---

## Target Configuration `src/i18n/index.ts`

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import plCommon from './locales/pl/common.json'
import plErrors from './locales/pl/errors.json'
import plBadges from './locales/pl/badges.json'
import plTour from './locales/pl/tour.json'

import enCommon from './locales/en/common.json'
import enErrors from './locales/en/errors.json'
import enBadges from './locales/en/badges.json'
import enTour from './locales/en/tour.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['pl', 'en'],
    defaultNS: 'common',
    ns: ['common', 'errors', 'badges', 'tour'],
    resources: {
      pl: { common: plCommon, errors: plErrors, badges: plBadges, tour: plTour },
      en: { common: enCommon, errors: enErrors, badges: enBadges, tour: enTour },
    },
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
```

---

## Phase Execution Order

```
Phase 2a (bugfix — skipped files)
    ↓
Phase 7 (language detector + switcher)
    ↓
Phase 8 (comments EN)
    ↓
Phase 5 (full E2E — to verify)
```

---

## Definition of Done (DoD)

- [x] Zero hardcoded Polish strings in React components
- [x] Zero hardcoded Polish strings in `*.ts` files outside `locales/`
- [x] All keys from `pl/*.json` have counterparts in `en/*.json`
- [x] `npm run build` without TypeScript errors
- [x] `npm run test:run` — 0 failed tests
- [x] Language change in UI works immediately and persists after refresh
- [x] Backend receives `Accept-Language` header with every request

---

*Last update: 2026-03-29*