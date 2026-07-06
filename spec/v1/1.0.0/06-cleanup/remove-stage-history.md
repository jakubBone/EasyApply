# Plan to Remove stage_history — Applikon

## Problem

Feature `stage_history` is implemented in backend and frontend,
but **is never displayed to the user** — no UI component renders it.

Backend saves stage history (when HR call was, when technical interview etc.),
frontend receives this data in every `/api/applications` response, but ignores it.

**Conclusion:** this is overengineering. Data is collected, takes up database space, complicates code,
but delivers no value to user.

---

## Usage Analysis — Where stage_history Exists in Code

### Backend — Files to Change

| File | What's there | What to do |
|------|---------|-----------|
| `entity/StageHistory.java` | JPA entity — maps `stage_history` table | Delete file |
| `repository/StageHistoryRepository.java` | Repo with `findByApplicationIdOrderByCreatedAtAsc`, `deleteByApplicationId` | Delete file |
| `dto/StageHistoryResponse.java` | DTO returned in `ApplicationResponse` | Delete file |
| `entity/Application.java` | Field `List<StageHistory> stageHistory` with `@OneToMany`, getter, `addStageHistory()` | Delete field and methods |
| `dto/ApplicationResponse.java` | Field `List<StageHistoryResponse> stageHistory`, mapping in `fromEntity()` | Delete field and mapping |
| `service/ApplicationService.java` | `stageHistoryRepository` (injected), `markCurrentStageCompleted()`, calls to `stageHistoryRepository.save/delete` in `create()`, `addStage()`, `updateStage()` | Delete all usages and private method |
| `service/UserService.java` | `stageHistoryRepository` (injected), `stageHistoryRepository.save(initialStage)` when creating demo app | Delete all usages |
| `repository/ApplicationRepository.java` | `@EntityGraph(attributePaths = {"stageHistory"})` and method `findByUserIdWithStageHistory` | Delete `@EntityGraph` and replace method with standard `findByUserId` |
| `db/migration/` | Table `stage_history` defined in `V1__init_schema.sql` | Add new migration `V5__drop_stage_history.sql` |

### Backend — Files to Change in Tests

| File | What's there | What to do |
|------|---------|-----------|
| `service/ApplicationServiceTest.java` | Mock `stageHistoryRepository`, test `updateStage_toInProgress_withCurrentStage_savesStageHistory` (added this session), verifications `verify(stageHistoryRepository)` | Delete mock and all verifications |
| `controller/ApplicationControllerTest.java` | `jsonPath("$.stageHistory").isArray()` and `jsonPath("$.stageHistory[?...]").exists()` | Delete assertions |

### Frontend — Files to Change

| File | What's there | What to do |
|------|---------|-----------|
| `types/domain.ts` | Interface `StageHistory` (lines 23-27), field `stageHistory: StageHistory[]` in `ApplicationResponse` (line 51) | Delete interface and field |

### Frontend — Files NOT to Change (verified)

The following files have `stageHistory` or `currentStage` in name/code — **checked, no changes needed:**

| File | Why we don't touch it |
|------|---------------------|
| `StageModal.tsx` | Uses `currentStage` (field on Application entity) — that's separate, not history |
| `KanbanBoard.tsx` | Uses `currentStage` — doesn't use `stageHistory` |
| `ApplicationCard.tsx` | Uses `currentStage` — doesn't use `stageHistory` |

---

## What Does NOT Change for the User

- Kanban board works the same — stages (drag&drop) are based on `currentStage` field in `Application` entity, not history
- Status changes (SENT → IN_PROGRESS → OFFER/REJECTED) work the same
- Application details view works the same
- No visible functionality will disappear — because no visible functionality uses it

---

## Risks

| Risk | Level | Mitigation |
|--------|--------|-----------|
| DROP TABLE migration is irreversible | Medium | Data is useless anyway (frontend never displayed it). Make database backup before executing. |
| Missing some usage in code → compilation error | Low | Compilation (`mvn compile`) will catch it before deployment |
| Test that stops compiling | Low | `mvn test` catches all |
| `findByUserIdWithStageHistory` is used in service — after changing to `findByUserId` need to check if lazy loading breaks serialization | Medium | Described in step 6 below |

---

## Execution Plan (step-by-step)

Each step ends with `mvn test` — we don't move forward if tests are red.

### Step 1 — Database Migration: DROP TABLE
- [ ] Add `V5__drop_stage_history.sql`:
  ```sql
  ALTER TABLE applications DROP CONSTRAINT IF EXISTS fk_applications_stage_history;
  ALTER TABLE cvs DROP CONSTRAINT IF EXISTS fk_cvs_stage_history;
  DROP TABLE IF EXISTS stage_history;
  ```
- [ ] `mvn compile` — check if Flyway doesn't complain

### Step 2 — Delete Files
- [ ] Delete `entity/StageHistory.java`
- [ ] Delete `repository/StageHistoryRepository.java`
- [ ] Delete `dto/StageHistoryResponse.java`
- [ ] `mvn compile` — there will be errors (usages in other files), this is expected

### Step 3 — Clean Up `Application.java`
- [ ] Delete `import StageHistory`
- [ ] Delete field `List<StageHistory> stageHistory`
- [ ] Delete getter `getStageHistory()`
- [ ] Delete method `addStageHistory()`
- [ ] `mvn compile`

### Step 4 — Clean Up `ApplicationResponse.java`
- [ ] Delete `import StageHistoryResponse`
- [ ] Delete field `List<StageHistoryResponse> stageHistory` from record
- [ ] Delete mapping `application.getStageHistory()...` in `fromEntity()`
- [ ] `mvn compile`

### Step 5 — Clean Up `ApplicationService.java`
- [ ] Delete `import StageHistoryRepository` and `import StageHistory`
- [ ] Delete field `stageHistoryRepository` and its injection in constructor
- [ ] Delete method `markCurrentStageCompleted()`
- [ ] In `create()`: delete `stageHistoryRepository.save(new StageHistory(...))`
- [ ] In `addStage()`: delete call to `markCurrentStageCompleted(application)` and `stageHistoryRepository.save(...)`
- [ ] In `updateStage()`: delete `stageHistoryRepository.deleteByApplicationId(...)` and `stageHistoryRepository.save(...)` (added this session)
- [ ] `mvn compile`

### Step 6 — Clean Up `ApplicationRepository.java` and `UserService.java`
- [ ] In `ApplicationRepository`: delete `@EntityGraph`, delete method `findByUserIdWithStageHistory`, add standard `findByUserId` (or check if it already exists)
- [ ] In `ApplicationService.findAllByUserId()`: change call to `findByUserId`
- [ ] In `UserService`: delete `import StageHistoryRepository` and `import StageHistory`, delete field and injection in constructor, delete `stageHistoryRepository.save(initialStage)`
- [ ] `mvn compile`

### Step 7 — Clean Up Tests
- [ ] In `ApplicationServiceTest`: delete mock `stageHistoryRepository`, delete test `updateStage_toInProgress_withCurrentStage_savesStageHistory`, delete all `verify(stageHistoryRepository)`
- [ ] In `ApplicationControllerTest`: delete assertions `$.stageHistory`
- [ ] `mvn test` — must be green

### Step 8 — Frontend
- [ ] In `domain.ts`: delete interface `StageHistory`, delete field `stageHistory` from `ApplicationResponse`
- [ ] Check if TypeScript compiles (`npm run build` or `tsc --noEmit`)

---

## Final Verification

After all steps:
- [ ] `mvn test` — green
- [ ] `npm run build` — no TypeScript errors
- [ ] Restart application — no errors on startup (Flyway, JPA)
- [ ] Manual: log in, open application, drag on Kanban — everything works as before changes

---

## When to Do This

This plan is ready to execute at any time as a separate session.
It's not part of Phase 4 learning — it's independent cleanup.
