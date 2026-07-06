# Plan: English Enum Codes + ContractType Bugfix

## Work Principle (each stage)

1. **Implementation** — Claude makes changes
2. **Tests** — `mvn test` + `npm run test:run` — both must be green
3. **Commit** — Claude proposes in project convention
4. **Continue** — Claude asks if we proceed

---

## Mapping: Old → New Values

### RejectionReason
| Old code | New code |
|-----------|----------|
| `BRAK_ODPOWIEDZI` | `NO_RESPONSE` |
| `ODMOWA_MAILOWA` | `EMAIL_REJECTION` |
| `ODRZUCENIE_PO_ROZMOWIE` | `REJECTED_AFTER_INTERVIEW` |
| `INNE` | `OTHER` |

### ApplicationStatus
| Old code | New code |
|-----------|----------|
| `WYSLANE` | `SENT` |
| `W_PROCESIE` | `IN_PROGRESS` |
| `OFERTA` | `OFFER` |
| `ODMOWA` | `REJECTED` |

> Legacy (V3 migration — likely no longer in DB, but statusConfig handles them):
> `ROZMOWA` → `IN_PROGRESS`, `ZADANIE` → `IN_PROGRESS`, `ODRZUCONE` → `REJECTED`

> `ZAKONCZONE` — virtual status only in frontend (Kanban merges OFFER+REJECTED).
> After rename: becomes `FINISHED` (string in STATUSES, not in backend enum).

### NoteCategory
| Old code | New code |
|-----------|----------|
| `PYTANIA` | `QUESTIONS` |
| `FEEDBACK` | `FEEDBACK` _(no change)_ |
| `INNE` | `OTHER` |
| `PYTANIE` (legacy) | `QUESTIONS` _(DB UPDATE + remove from enum)_ |
| `KONTAKT` (legacy) | `OTHER` _(DB UPDATE + remove from enum)_ |

### ContractType
| Old code | New code | Meaning |
|-----------|----------|-----------|
| `B2B` | `B2B` _(no change)_ | Business-to-Business |
| `UOP` | `EMPLOYMENT` | Employment Contract |
| `UZ` | `MANDATE` | Mandate Contract |
| `INNA` | `OTHER` | Other |

### SalaryType
| Old code | New code |
|-----------|----------|
| `BRUTTO` | `GROSS` |
| `NETTO` | `NET` |

---

## ✅ Stage 1 — RejectionReason — COMPLETED

### Backend
- [x] `entity/RejectionReason.java` — change enum values
- [x] `db/migration/V5__rename_rejection_reasons.sql` — Flyway UPDATE
- [x] `service/ApplicationService.java` — no direct references (pass-through)
- [x] `service/StatisticsService.java` — `BRAK_ODPOWIEDZI` → `NO_RESPONSE`
- [x] `repository/ApplicationRepository.java` — no direct references
- [x] tests: `ApplicationControllerTest`, `ApplicationServiceTest`, `StatisticsControllerTest`, `StatisticsServiceTest`

### Frontend
- [x] `types/domain.ts` — `RejectionReason` type fixed (was out of sync with backend)
- [x] `kanban/types.ts` — `REJECTION_REASONS` — updated `id` values
- [x] `kanban/EndModal.tsx` — `'INNE'` → `'OTHER'`
- [x] `kanban/ApplicationCard.tsx` — no direct references (uses `REJECTION_REASONS`)

### Test Results
- `mvn test` — 84/84 ✅
- `npm run test:run` — 67/67 ✅

### Flyway V5
```sql
UPDATE applications SET rejection_reason = 'NO_RESPONSE'            WHERE rejection_reason = 'BRAK_ODPOWIEDZI';
UPDATE applications SET rejection_reason = 'EMAIL_REJECTION'         WHERE rejection_reason = 'ODMOWA_MAILOWA';
UPDATE applications SET rejection_reason = 'REJECTED_AFTER_INTERVIEW' WHERE rejection_reason = 'ODRZUCENIE_PO_ROZMOWIE';
UPDATE applications SET rejection_reason = 'OTHER'                   WHERE rejection_reason = 'INNE';
```

---

## ✅ Stage 2 — NoteCategory — COMPLETED

### Backend
- [x] `entity/NoteCategory.java` — `PYTANIA`→`QUESTIONS`, `INNE`→`OTHER`, removed legacy `PYTANIE`, `KONTAKT`
- [x] `entity/Note.java` — default value `INNE` → `OTHER` (3 places + column default)
- [x] `db/migration/V6__rename_note_categories.sql`
- [x] `dto/NoteRequest.java`, `dto/NoteResponse.java` — no direct references
- [x] `service/UserService.java` — no references to NoteCategory
- [x] tests: `NoteControllerTest`, `NoteServiceTest`

### Frontend
- [x] `types/domain.ts` — `NoteCategory` type
- [x] `notes/NotesList.tsx` — `CATEGORIES` values + `LEGACY_CATEGORY_MAP` (added mappings for old `PYTANIA`/`INNE` from DB)
- [x] `notes/NotesList.tsx` — default `useState` `'PYTANIA'` → `'QUESTIONS'`

### Test Results
- `mvn test` — 84/84 ✅
- `npm run test:run` — 67/67 ✅

---

## ✅ Stage 3 — SalaryType — COMPLETED

### Backend
- [x] `entity/SalaryType.java` — `BRUTTO`→`GROSS`, `NETTO`→`NET`
- [x] `db/migration/V7__rename_salary_types.sql`
- [x] `service/UserService.java` — `SalaryType.NETTO` → `SalaryType.NET`
- [x] tests: `ApplicationControllerTest` (string literal), `ApplicationServiceTest` (enum ref)

### Frontend
- [x] `types/domain.ts` — `SalaryType` type
- [x] `components/applications/SalaryFormSection.tsx` — `value="BRUTTO/NETTO"` and `checked` comparisons
- [x] `components/applications/ApplicationForm.tsx` — default value `'BRUTTO'` → `'GROSS'`
- [x] `ApplicationTable.tsx`, `ApplicationDetails.tsx` — `salaryType.toLowerCase()` works correctly (`'gross'`, `'net'`)

### Test Results
- `mvn test` — 84/84 ✅
- `npm run test:run` — 67/67 ✅

---

## ✅ Stage 4 — ContractType + Display Bugfix — COMPLETED

### Backend
- [x] `entity/ContractType.java` — `UOP`→`EMPLOYMENT`, `UZ`→`MANDATE`, `INNA`→`OTHER`
- [x] `db/migration/V8__rename_contract_types.sql`
- [x] `service/UserService.java` — `ContractType.UOP` → `ContractType.EMPLOYMENT`
- [x] tests: `ApplicationServiceTest` (`ContractType.UOP` → `EMPLOYMENT`)

### Frontend — Bugfix
- [x] `types/domain.ts` — fixed (was: `UOP|B2B|UZ|UOD|INNE`, now: `B2B|EMPLOYMENT|MANDATE|OTHER`)
- [x] `i18n/locales/en/common.json` — added `contractB2B`, `contractEmployment`, `contractMandate`, `contractOther`
- [x] `i18n/locales/pl/common.json` — Polish equivalents
- [x] `components/applications/SalaryFormSection.tsx` — `<option>` values updated, labels via `t()`
- [x] `components/applications/ApplicationTable.tsx` — inline `contractKeys` map, `t()` instead of raw value
- [x] `components/applications/ApplicationDetails.tsx` — `formatSalary` extended with `t: TFunction`, `CONTRACT_TYPE_KEYS` map

### Test Results
- `mvn test` — 84/84 ✅
- `npm run test:run` — 67/67 ✅

---

## ✅ Stage 5 — ApplicationStatus — COMPLETED

### Backend
- [x] `entity/ApplicationStatus.java` — WYSLANE→SENT, W_PROCESIE→IN_PROGRESS, OFERTA→OFFER, ODMOWA→REJECTED
- [x] `entity/Application.java` — default value `WYSLANE` → `SENT`
- [x] `db/migration/V9__rename_application_statuses.sql` (incl. legacy ROZMOWA/ZADANIE/ODRZUCONE)
- [x] `service/ApplicationService.java` — all references
- [x] `service/StatisticsService.java` — ODMOWA→REJECTED, OFERTA→OFFER
- [x] `service/UserService.java` — WYSLANE→SENT
- [x] tests: `ApplicationControllerTest`, `ApplicationServiceTest`, `StatisticsServiceTest`, `StatisticsControllerTest`, `NoteControllerTest`, `CVServiceTest`, `NoteServiceTest`

### Frontend
- [x] `types/domain.ts` — `ApplicationStatus` type
- [x] `constants/applicationStatus.ts` — STATUS_CONFIG keys and labelKeys
- [x] `kanban/types.ts` — STATUSES ids and labelKeys
- [x] `kanban/KanbanBoard.tsx` — all literals (WYSLANE/W_PROCESIE/OFERTA/ODMOWA/ZAKONCZONE + legacy)
- [x] `kanban/ApplicationCard.tsx` — W_PROCESIE/OFFER/ODMOWA
- [x] `kanban/EndModal.tsx` — OFERTA/ODMOWA
- [x] `kanban/MoveModal.tsx` — OFERTA/ODMOWA/ZAKONCZONE
- [x] `applications/ApplicationTable.tsx` — removed legacy statusConfig entries, updated fallback
- [x] `i18n/locales/en/common.json` — statusConfig and kanban keys renamed, legacy removed
- [x] `i18n/locales/pl/common.json` — same
- [x] tests: `App.test.tsx`, `useApplications.test.tsx`

### Test Results
- `mvn test` — 84/84 ✅
- `npm run test:run` — 67/67 ✅

---

## ✅ Stage 6 — i18n key cleanup — COMPLETED

Rename JSON keys from Polish names to English (no DB changes, frontend only):

| Old key | New key |
|-------------|------------|
| `notes.catPytania` | `notes.catQuestions` |
| `notes.catInne` | `notes.catOther` |
| `salary.brutto` | `salary.gross` |
| `salary.netto` | `salary.net` |
| `kanban.statusWYSLANE` | `kanban.statusSENT` _(already after Stage 5)_ |
| `kanban.statusW_PROCESIE` | `kanban.statusIN_PROGRESS` _(already after Stage 5)_ |
| `kanban.statusZAKONCZONE` | `kanban.statusFINISHED` _(already after Stage 5)_ |
| `kanban.rejectionBrakOdpowiedzi` | `kanban.rejectionNoResponse` |
| `kanban.rejectionOdmowaMailowa` | `kanban.rejectionEmailRejection` |
| `kanban.rejectionOdrzuceniePo` | `kanban.rejectionAfterInterview` |
| `kanban.rejectionInne` | `kanban.rejectionOther` |
| `statusConfig.WYSLANE` | `statusConfig.SENT` _(already after Stage 5)_ |
| `statusConfig.W_PROCESIE` | `statusConfig.IN_PROGRESS` _(already after Stage 5)_ |
| `statusConfig.OFERTA` | `statusConfig.OFFER` _(already after Stage 5)_ |
| `statusConfig.ODMOWA` | `statusConfig.REJECTED` _(already after Stage 5)_ |

- [x] `en/common.json` + `pl/common.json` — rename keys
- [x] `notes/NotesList.tsx` — `CATEGORIES` and `LEGACY_CATEGORY_MAP` labelKey
- [x] `kanban/types.ts` — `REJECTION_REASONS` labelKey
- [x] `components/applications/SalaryFormSection.tsx` — `t('salary.brutto/netto')` → `t('salary.gross/net')`

### Test Results
- `mvn test` — 84/84 ✅
- `npm run test:run` — 67/67 ✅

---

## Important Notes

- **ZAKONCZONE** never exists in backend — virtual Kanban column merging `OFFER` and `REJECTED`
- **Legacy statuses** (`ROZMOWA`, `ZADANIE`, `ODRZUCONE`) after Stage 5 can be removed from `statusConfig` if V9 migration is certain (optional in Stage 5)
- **Frontend type mismatches** fixed in each stage (were: `ContractType` had `UOD`/`INNE` instead of `INNA`, `RejectionReason` had completely different values than backend)

---

*Created: 2026-03-29*
