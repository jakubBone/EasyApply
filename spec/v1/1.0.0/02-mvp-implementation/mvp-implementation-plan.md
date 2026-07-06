# Applikon — MVP Implementation Plan (Updated)

---

## PHASE 1: Backend API

**Goal:** Working REST API returning and saving applications to PostgreSQL with support for salary ranges, contract types, and job posting content.

### Steps:

1. **Create Spring Boot project with PostgreSQL**
   - Generate project: Spring Initializr (Java 21, Spring Boot 3.4, dependencies: Web, Data JPA, PostgreSQL, Validation)
   - Configure `application.properties`:
     ```properties
     spring.datasource.url=jdbc:postgresql://localhost:5432/applikon_db
     spring.datasource.username=postgres
     spring.datasource.password=postgres
     spring.jpa.hibernate.ddl-auto=update
     spring.jpa.show-sql=true
     spring.servlet.multipart.max-file-size=5MB
     spring.servlet.multipart.max-request-size=5MB
     ```
   - Create PostgreSQL database: `CREATE DATABASE applikon_db;`

2. **Define Application entity**
   - Create `Application.java` with fields:
     - id, company, position, link
     - salaryMin, salaryMax (salary ranges)
     - currency (PLN/EUR/USD/GBP)
     - salaryType (enum: GROSS, NET)
     - contractType (enum: B2B, EMPLOYMENT, CONTRACT, OTHER)
     - salarySource (enum - source of rate)
     - source, status, jobDescription, agency, appliedAt
     - currentStage (current recruitment stage)
     - rejectionReason (enum: NO_RESPONSE, EMAIL_REJECTION, REJECTED_AFTER_INTERVIEW, OTHER)
     - rejectionDetails (rejection details)
     - cv (relation @ManyToOne to CV)
     - stageHistory (relation @OneToMany to StageHistory)
   - Add `ApplicationStatus` enum (SENT, IN_PROCESS, OFFER, REJECTION)
   - Add validation: @NotBlank for company/position, @Min(0) for salaryMin/salaryMax
   - Add `@EntityListeners(AuditingEntityListener.class)` to Application class
   - appliedAt field: `@CreatedDate private LocalDateTime appliedAt;` (auto-set on creation)

3. **Define StageHistory entity (recruitment stage history)**
   - Create `StageHistory.java` with fields: id, application, stageName, completed, createdAt, completedAt
   - @ManyToOne relation with Application
   - `markCompleted()` method to close stages

4. **Build repository and service**
   - Create `ApplicationRepository extends JpaRepository`
   - Create `StageHistoryRepository extends JpaRepository`
   - Create `ApplicationService` with methods:
     - create() - creates application with initial stage history entry
     - findAll(), findById()
     - updateStatus(), updateStage() - handle status transitions
     - addStage() - add new recruitment stage
     - findDuplicates() - detect duplicates (company + position, case-insensitive)
     - update(), delete()

5. **Build REST controller**
   - Endpoint: `POST /api/applications` (creates application, @Valid for validation)
   - Endpoint: `GET /api/applications` (returns list)
   - Endpoint: `GET /api/applications/{id}` (returns details)
   - Endpoint: `PUT /api/applications/{id}` (updates application)
   - Endpoint: `DELETE /api/applications/{id}` (deletes application)
   - Endpoint: `PATCH /api/applications/{id}/status` (changes status)
   - Endpoint: `PATCH /api/applications/{id}/stage` (changes stage with completion support)
   - Endpoint: `POST /api/applications/{id}/stage` (adds new stage)
   - Endpoint: `GET /api/applications/check-duplicate` (checks for duplicates)
   - Endpoint: `PATCH /api/applications/{id}/cv` (assigns CV)

6. **Add CORS configuration**
   - Create `@Configuration` class `CorsConfig` with `WebMvcConfigurer`
   - Allow requests from `http://localhost:5173` (Vite frontend)
   - Allowed methods: GET, POST, PUT, PATCH, DELETE
   - Allowed headers: Content-Type, Authorization

7. **Add global error handling**
   - Create `@RestControllerAdvice` class `GlobalExceptionHandler`
   - Handle `MethodArgumentNotValidException` (validation) → 400 Bad Request
   - Handle `EntityNotFoundException` → 404 Not Found
   - Handle `Exception` (fallback) → 500 Internal Server Error
   - Return JSON with `{"error": "message", "timestamp": "..."}`

8. **Enable JPA Auditing**
   - Add `@EnableJpaAuditing` to main application class (@SpringBootApplication)
   - This enables @CreatedDate to work for appliedAt field

### Edge cases to handle:

- **Multi-currency:** `currency` field (String: PLN/EUR/USD/GBP) without converter
- **Salary ranges:** `salaryMin` and `salaryMax` fields (Integer, nullable)
- **Salary type:** `salaryType` field (enum: GROSS/NET)
- **Contract type:** `contractType` field (enum: B2B/EMPLOYMENT/CONTRACT/OTHER)
- **Expired links:** `jobDescription` field (TEXT) for job posting content
- **Hidden recruitment:** `agency` field (String, nullable) for agency name
- **Flexible stages:** `currentStage` field (String) + `stage_history` table
- **Rejection reasons:** `rejectionReason` field (enum) + `rejectionDetails` (String)

### Definition of "done":

- Application is saved in PostgreSQL with all fields (appliedAt auto-generated)
- API returns JSON with saved data
- Validation works (400 error for empty company, JSON message)
- Status can be changed via PATCH
- Recruitment stages are tracked in history
- CORS works (frontend can call API from localhost:5173)
- Error handling returns readable errors in JSON format

### Test:

```bash
# Start backend
./mvnw spring-boot:run

# Test 1: Add application with salary ranges (appliedAt auto-generated)
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "company":"Google",
    "position":"Junior Java Dev",
    "salaryMin":8000,
    "salaryMax":12000,
    "currency":"PLN",
    "salaryType":"GROSS",
    "contractType":"B2B",
    "link":"https://careers.google.com/123",
    "source":"LinkedIn",
    "jobDescription":"Java 11+, Spring Boot, Docker",
    "agency":null
  }'
# Returns: {"id":1, "company":"Google", ..., "appliedAt":"2026-01-18T12:34:56", "status":"SENT"}

# Test 2: Check list
curl http://localhost:8080/api/applications
# Returns JSON array with applications

# Test 3: Validation - missing company (should return 400)
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d '{"position":"Dev","salaryMin":5000,"currency":"PLN"}'
# Returns: {"error":"company: Company name cannot be empty", ...}

# Test 4: Change stage to "In process"
curl -X PATCH http://localhost:8080/api/applications/1/stage \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROCESS","currentStage":"HR Interview"}'

# Test 5: Check for duplicates
curl "http://localhost:8080/api/applications/check-duplicate?company=Google&position=Junior%20Java%20Dev"
# Returns: [{"id":1, "company":"Google", ...}]
```

---

## PHASE 2: Frontend - Form and List

**Goal:** React UI displaying application list, form for adding with salary ranges and duplicate warning.

### Steps:

1. **Create React project with JavaScript**
   - `npm create vite@latest applikon-frontend -- --template react`
   - Install @dnd-kit: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
   - Create `src/services/api.js` with API functions

2. **Build API service**
   - Create `src/services/api.js` with functions:
     - fetchApplications(), createApplication(), updateApplication()
     - updateApplicationStatus(), updateApplicationStage()
     - checkDuplicate(), deleteApplication()
   - Use fetch API to communicate with http://localhost:8080/api/applications

3. **Build App.jsx component**
   - Application state management (applications, view, formData, selectedApp)
   - View switching: Kanban, List, CV, Details
   - Add application form in modal with fields:
     - company, position (required)
     - salaryMin, salaryMax, isRange (checkbox for ranges)
     - currency (select: PLN/EUR/USD/GBP)
     - salaryType (radio: Gross/Net)
     - contractType (select: B2B/Employment/Contract/Other)
     - source, link, jobDescription (textarea)
   - NOTE: appliedAt is auto-generated by backend (@CreatedDate) - DO NOT add to form
   - Before sending: call checkDuplicate() and show warning if company+position exists
   - Application edit form (same layout as adding)

4. **Build SalaryFormSection component**
   - Separate component for salary section
   - Input for salaryMin, optional input for salaryMax (visible when isRange=true)
   - Select for currency
   - Radio buttons for type (gross/net)
   - Select for contract type

5. **Application details view**
   - Display all application data
   - Status and current stage
   - Link to offer (if exists)
   - Assigned CV with download option
   - Notes list (NotesList)
   - "Edit" button opening edit form

### Edge cases to handle:

- **Reapplication:** Call `GET /api/applications/check-duplicate?company=X&position=Y` before save, message: "You already applied to this company for this position (date: XX.XX.XXXX). Continue?"
- **Duplicate offers:** Warning based on company + position (case-insensitive)
- **Ranges vs single salary:** Checkbox "Salary ranges" shows/hides salaryMax field

### Definition of "done":

- Form works, data reaches database via API
- List refreshes after adding application
- Duplicate shows warning (but allows saving)
- Salary ranges display correctly (e.g., "8,000 - 12,000 PLN gross, B2B")
- Details view shows all application data
- Editing application works correctly

### Test:

```bash
# Start frontend
npm run dev

# In browser:
1. Open http://localhost:5173
2. Click "+ Add application"
3. Fill form: Google, Junior Java Developer, 8000-12000 PLN gross B2B, LinkedIn
4. Click "Add application" → application appears in view
5. Add again: Google, Junior Java Developer → WARNING: "You already applied 18.01.2026"
6. Click "Continue despite duplicate" → duplicate is saved
7. Refresh page (F5) → both applications still visible
8. Click on application card → details view
9. Click "Edit" → change salary to 10000-15000 → Save
10. Check if salary was updated
```

---

## PHASE 3: Kanban Board with Flexible Stages

**Goal:** Kanban board with 3 columns, drag & drop with stage selection and completion modals.

### Steps:

1. **Install drag & drop library**
   - `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
   - Create `KanbanBoard.jsx` component

2. **Build 3 Kanban columns**
   - **Sent (SENT)** - new applications
   - **In process (IN_PROCESS)** - with current recruitment stage
   - **Completed (COMPLETED)** - offers (OFFER) and rejections (REJECTION)
   - Each column = droppable container with list of application cards
   - Application card = draggable element (company, position, application date)

3. **Build ApplicationCard component**
   - Displays: company, position, application date
   - For IN_PROCESS: stage selection dropdown (predefined + custom)
   - For REJECTION: shows rejection reason
   - For OFFER: checkmark icon
   - For REJECTION: X icon

4. **Predefined recruitment stages**
   - HR interview
   - Technical interview
   - Interview with manager
   - Recruitment task
   - Final interview
   - + ability to add custom stage

5. **Add drag & drop handling**
   - Drag to "In process" → opens stage selection modal (StageModal)
   - Drag to "Completed" → opens completion modal (EndModal)
   - Drag to "Sent" → resets stages and status
   - Call `PATCH /api/applications/{id}/stage` with appropriate data

6. **Stage selection modal (StageModal)**
   - List of predefined stages to choose from
   - Input for custom stage + "Add" button
   - Current stage highlighted

7. **Completion modal (EndModal)**
   - Choice: Offer received / Rejection
   - For rejection: select reason + optional details
   - Reasons: No response, Email rejection, Rejected after interview, Other reason

### Edge cases to handle:

- **Reverting to previous column:** Clears stage/rejection data
- **Changing stage on card:** Dropdown directly on card in "In process" column
- **Custom stages:** Input allows adding any stage

### Definition of "done":

- 3 Kanban columns display on page
- Applications distribute across columns by status
- Drag & drop works smoothly
- Stage selection modal opens when dragging to "In process"
- Completion modal opens when dragging to "Completed"
- Status and stage change in database after selection
- Cards stay in new columns after page refresh

### Test:

```bash
# In browser:
1. Add application "Google, Junior Dev" → goes to "Sent" column
2. Drag card to "In process" column
3. In modal select "HR Interview" → card shows "HR Interview" stage
4. Click dropdown on card → change to "Technical Interview"
5. Drag card to "Completed" column
6. In modal select "Rejection" → reason "No response"
7. Card shows X icon and "No response"
8. Refresh page (F5) → card still in "Completed" with rejection reason
9. Drag card back to "Sent"
10. Check backend: curl http://localhost:8080/api/applications/1
   # status: "SENT", currentStage: null, rejectionReason: null
```

---

## PHASE 4: CV Management (3 Types)

**Goal:** CV management with 3 types: PDF file, external link, note. Assign CV to applications.

### Steps:

1. **Add CV entity in backend**
   - Create `CV.java` with fields:
     - id
     - type (enum: FILE, LINK, NOTE)
     - fileName (internal UUID filename)
     - originalFileName (original displayed name)
     - filePath (path for FILE type)
     - fileSize (size for FILE type)
     - externalUrl (URL for LINK type)
     - uploadedAt (@CreatedDate)
   - Add `cvs` table to database
   - Create `CVRepository`

2. **Build CVService**
   - Method `uploadFile(MultipartFile file)`: validate (only PDF, max 5MB), save to `./uploads/cv/`, generate UUID filename
   - Method `createLinkOrNote(name, type, externalUrl)`: create CV of LINK or NOTE type
   - Method `loadFile(Long id)`: read file from disk (Resource)
   - Method `delete(Long id)`: delete CV and file (if FILE)
   - Method `update(Long id, name, externalUrl)`: update name and URL
   - Method `assignCVToApplication(appId, cvId)`: assign CV to application
   - Method `removeCVFromApplication(appId)`: remove assignment

3. **Build REST endpoint for CV**
   - Endpoint: `POST /api/cv/upload` (accepts MultipartFile, returns CV)
   - Endpoint: `POST /api/cv` (creates CV of LINK or NOTE type)
   - Endpoint: `GET /api/cv` (list all CVs)
   - Endpoint: `GET /api/cv/{id}` (returns CV metadata)
   - Endpoint: `GET /api/cv/{id}/download` (returns PDF file, Content-Disposition: attachment)
   - Endpoint: `PUT /api/cv/{id}` (updates name and URL)
   - Endpoint: `DELETE /api/cv/{id}` (deletes CV)

4. **Build CVManager component in frontend**
   - Main view: CV list grouped by type (Files, Links, On my computer)
   - Selected CV details panel
   - Add CV modal with type selection:
     - "Upload file" → upload PDF
     - "Don't upload file" → external link or name only
   - Validation: only .pdf, max 5MB
   - List of applications assigned to CV
   - Ability to assign CV to application (selection modal)
   - Ability to remove assignment
   - Edit name and URL (for LINK/NOTE type)

5. **CV grouping**
   - 📄 Uploaded files (FILE) - shows size
   - 🔗 External links (LINK) - shows domain
   - 💻 On my computer (NOTE) - shows "on my computer"
   - Usage counter for each CV

### Edge cases to handle:

- **File type validation:** Only PDF allowed
- **Size validation:** Max 5MB
- **One CV can be assigned to multiple applications**
- **Deleting CV:** Also removes from assigned applications (relation)
- **External link:** Can be empty for NOTE type

### Definition of "done":

- PDF upload works, file is saved to server disk
- Can create LINK CV (with URL) and NOTE CV (name only)
- CV metadata is saved in `cvs` table
- CV can be assigned to application
- Downloading CV file type works (click → download file)
- Opening CV link type works (opens URL in new tab)
- Validation blocks files > 5MB and non-PDF
- CV grouping works correctly
- Editing and deleting CV works

### Test:

```bash
# In browser:
1. Go to "CV" tab
2. Click "+ Add CV"
3. Select "Upload file" → select CV_Java.pdf (2MB) → success
4. CV appears in "Uploaded files" group
5. Click "+ Add CV" → select "Don't upload file"
6. Select "In cloud" → enter name "CV_Frontend.pdf" → paste Google Drive link → Save
7. CV appears in "External links" group
8. Click "+ Add CV" → "Don't upload file" → "On my computer" → name "CV_General.pdf" → Save
9. CV appears in "On my computer" group
10. Select CV_Java.pdf → click "Assign" → select application "Google - Junior Dev"
11. Open Google application details → see: "CV: CV_Java.pdf" + "Download" button
12. Click "Download" → file downloads

# Validation test:
1. Try uploading README.txt → error: "Only PDF files allowed"
2. Try uploading Large_CV.pdf (10MB) → error: "File cannot exceed 5MB"

# Backend test:
curl -X POST http://localhost:8080/api/cv/upload \
  -F "file=@CV_Java.pdf"

curl http://localhost:8080/api/cv/1/download --output downloaded.pdf
```

---

## PHASE 5: Notes with Categories

**Goal:** Add text notes to applications with categories (Questions, Feedback, Other). Edit and delete notes.

### Steps:

1. **Add Note entity in backend**
   - Create `Note.java` with fields:
     - id
     - content (TEXT, @NotBlank)
     - category (enum: QUESTIONS, FEEDBACK, OTHER)
     - createdAt (@CreatedDate)
     - application (@ManyToOne, nullable = false)
   - Add `NoteCategory` enum with values: QUESTIONS, FEEDBACK, OTHER
   - Add `notes` table to database
   - Create `NoteRepository`

2. **Build NoteService**
   - Method `findByApplicationId(Long appId)`: return notes for application (newest first)
   - Method `create(Long appId, String content, NoteCategory category)`: create note
   - Method `update(Long noteId, String content, NoteCategory category)`: update note
   - Method `delete(Long noteId)`: delete note
   - Method `deleteByApplicationId(Long appId)`: delete all application notes (cascade)

3. **Build REST endpoint for notes**
   - Endpoint: `GET /api/applications/{id}/notes` (returns notes list for application)
   - Endpoint: `POST /api/applications/{id}/notes` (adds new note)
   - Endpoint: `PUT /api/notes/{id}` (updates note)
   - Endpoint: `DELETE /api/notes/{id}` (deletes note)

4. **Build NotesList component in frontend**
   - Note adding form:
     - Category selection buttons (Interview questions, Feedback, Other)
     - Textarea for note content
     - "Add note" button
   - Notes list below form (newest on top):
     - Category tag (colored)
     - Note content
     - Relative time (e.g., "5 min ago", "yesterday", "3 days ago")
     - "Edit" and "Delete" buttons
   - Inline note edit mode

5. **Category coloring**
   - QUESTIONS: blue (#3498db)
   - FEEDBACK: green (#27ae60)
   - OTHER: gray (#95a5a6)

6. **Relative time**
   - < 1 min: "Just now"
   - < 60 min: "X min ago"
   - < 24h: "X hours ago"
   - 1 day: "Yesterday"
   - < 7 days: "X days ago"
   - >= 7 days: "DD.MM.YYYY"

### Edge cases to handle:

- **Empty note:** @NotBlank validation blocks empty notes
- **Default category:** OTHER (if not selected)
- **Deleting application:** Cascading note deletion

### Definition of "done":

- Notes are saved in database with timestamp and category
- Notes list displays under application
- Categories are colored
- Relative time displays correctly
- Note editing works (inline)
- Note deletion works (with confirmation)
- Deleting application also deletes notes

### Test:

```bash
# In browser:
1. Open details for application "Google - Junior Dev"
2. In notes section select category "Interview questions"
3. Type: "Asked about Spring Boot, Docker and Kubernetes"
4. Click "Add note" → note appears in list
5. See tag "Interview questions" (blue) and time "Just now"
6. Add another note category "Feedback": "Positive feedback, invited to technical interview"
7. Click "Edit" on first note → change content → "Save"
8. Click "Delete" on second note → confirm → note disappears
9. Refresh page → first note still visible

# Backend test:
curl http://localhost:8080/api/applications/1/notes

curl -X POST http://localhost:8080/api/applications/1/notes \
  -H "Content-Type: application/json" \
  -d '{"content":"Contact: jan.kowalski@google.com","category":"OTHER"}'
```

---

## PHASE 6: Table View

**Goal:** Alternative list view of applications in table form with sorting, filtering, and bulk deletion.

### Steps:

1. **Build ApplicationTable component**
   - Table with columns: Checkbox, Company, Position, Salary, Status, Application date
   - Sorting by: date, company, position
   - Filtering by status (all, sent, in process, offer, rejection)
   - Text search (company, position)
   - Days counter since application

2. **Checkbox and bulk deletion**
   - Checkbox for each row
   - "Delete selected" button (appears when something selected)
   - Deletion confirmation
   - Call DELETE /api/applications/{id} for each selected

3. **Click on row**
   - Opens application details view

### Definition of "done":

- Table displays all applications
- Sorting works (click column header)
- Status filtering works
- Search works
- Bulk deletion works
- Clicking row opens details

### Test:

```bash
# In browser:
1. Go to "List" tab
2. Add 5 applications with different statuses
3. Click "Date" header → descending sort
4. Click again → ascending sort
5. Select "In process" filter → only in-process applications
6. Type "Google" in search → only Google applications
7. Check 2 applications
8. Click "Delete selected" → confirm → applications disappear
```

---

## PHASE 7: Gamification (Badges)

**Goal:** Motivation badge system for rejections and ghosting. Widget displaying progress.

### Steps:

1. **Build StatisticsService in backend**
   - Method `getBadgeStats()` returning:
     - totalRejections (rejection count)
     - totalGhosting (rejections with NO_RESPONSE reason)
     - totalOffers (offers count)
     - rejectionBadge (current rejection badge)
     - ghostingBadge (current ghosting badge)
     - sweetRevengeUnlocked (whether "Sweet Revenge" is unlocked)

2. **Rejection badges** (thresholds: 5, 10, 25, 50, 100)
   - 🥊 Warmup (5): "You're just starting. The job market doesn't know who they're dealing with."
   - 🍳 Skillet (10): "Rejections slide off you like eggs in a pan."
   - 🦾 Indestructible (25): "25 companies underestimated your potential. Their loss."
   - 👑 LinkedIn Legend (50): "Fifty rejections and still in the game. Respect."
   - 🎰 Statistical Certainty (100): "With such a sample size, the next one HAS to be it."

3. **Ghosting badges** (thresholds: 5, 15, 30, 50, 100)
   - 👻 Specter (5): "5 companies didn't respond at all. Check if they have internet."
   - 🧘 Patient Monk (15): "Waiting is a skill. You're mastering it."
   - 🔍 Detective (30): "30 unsolved cases. Maybe it's them, not you."
   - 🫥 Ghost-Man (50): "50 companies pretend you don't exist. But you know better."
   - 🤫 King of Silence (100): "100 companies silent. Congratulations on perseverance!"

4. **Sweet Revenge**
   - Unlocked when: totalRejections >= 10 AND totalOffers > 0
   - "Sweet revenge - you got an offer despite many rejections!"

5. **Build REST endpoint**
   - Endpoint: `GET /api/statistics/badges` (returns BadgeStatsResponse)

6. **Build BadgeWidget component in frontend**
   - Displays current rejection badge (if any)
   - Displays current ghosting badge (if any)
   - Shows progress to next badge
   - Sweet Revenge as special badge
   - Expandable panel with details

### Definition of "done":

- Statistics calculate correctly
- Widget displays appropriate badges
- Progress to next badge is visible
- Sweet Revenge unlocks when conditions met

### Test:

```bash
# In browser:
1. Add 5 applications and mark as rejection (any reason)
2. Widget shows "Warmup" badge 🥊
3. Add 5 more rejections → Widget shows "Skillet" 🍳
4. Change 3 rejections to "No response" reason
5. Widget shows ghosting badge if threshold reached
6. Change one application to "Offer"
7. If 10+ rejections → "Sweet Revenge" appears

# Backend test:
curl http://localhost:8080/api/statistics/badges
```

---

## INTEGRATION TEST MVP

### Success Scenario (happy path):

**User: Junior Developer looking for work**

1. **Adding applications:**
   - Opens http://localhost:5173
   - Clicks "+ Add application"
   - Fills form: Google, Junior Java Developer, 10000-15000 PLN gross B2B, LinkedIn
   - Pastes job posting content in textarea
   - Clicks "Add application" → application appears in "Sent" column on Kanban

2. **CV upload:**
   - Goes to "CV" tab
   - Clicks "+ Add CV" → "Upload file"
   - Selects CV_Java_Spring.pdf
   - CV appears in list
   - Clicks "Assign" → selects application "Google - Junior Java Developer"
   - Sees CV assigned to application

3. **Tracking progress:**
   - After a week: drags "Google" card from "Sent" to "In process"
   - In modal selects "HR Interview"
   - Opens application details
   - Adds note category "Questions": "Asked about Spring Boot, Docker, REST API"
   - Adds note category "Other": "Recruiter: Anna Nowak, anna.nowak@google.com"

4. **Changing stage:**
   - On card clicks dropdown → changes stage to "Technical Interview"
   - Adds another note: "Homework: REST API in Spring Boot"

5. **Completing process:**
   - Drags card to "Completed" column
   - In modal selects "Offer received"
   - Card shows ✓ icon
   - Badge widget updates (if previous rejections)

6. **Checking duplicates:**
   - Tries adding again: Google, Junior Java Developer
   - Gets warning: "You already applied to this company for this position (18.01.2026)"
   - Can continue or cancel

7. **Table view:**
   - Goes to "List" view
   - Sorts by application date
   - Filters only "Offers"
   - Sees all received offers

### Error Scenario:

**Error 1: User tries adding application without required fields**
- Action: Doesn't fill "Company" field, clicks "Add application"
- Result: Field is highlighted, form doesn't submit (HTML5 validation)
- Application NOT saved

**Error 2: User tries uploading .docx instead of PDF**
- Action: Selects CV.docx file, clicks "Upload"
- Result: Alert: "Only PDF files allowed"
- File NOT uploaded

**Error 3: User tries uploading 10MB file**
- Action: Selects Large_CV.pdf (10MB), clicks "Upload"
- Result: Alert: "File cannot exceed 5MB"
- File NOT uploaded

**Error 4: Backend not running (port 8080 occupied)**
- Action: User tries adding application
- Result: Console error, no data loading
- Application list shows "Loading..." or empty state

**Error 5: User enters negative salary**
- Action: Types "-5000" in salaryMin field
- Result: Backend returns validation error: "Salary must be positive"
- Application NOT saved

### Final MVP Verification:

**Acceptance criteria:**
- ✅ User can add 20 applications with various data
- ✅ All applications survive page refresh (saved in database)
- ✅ Application date (appliedAt) is auto-generated - user doesn't provide it
- ✅ Dragging Kanban cards changes status in database
- ✅ Stage selection modal opens when transitioning to "In process"
- ✅ Completion modal opens when transitioning to "Completed"
- ✅ Predefined and custom recruitment stages work
- ✅ CV upload works (3 types: file, link, note)
- ✅ Assigning CV to application works
- ✅ Downloading uploaded PDF file works
- ✅ Notes save with categories and timestamp
- ✅ Note editing and deletion work
- ✅ Duplicates are detected and warning displayed
- ✅ Salary ranges work (PLN, EUR, USD, GBP, gross/net, B2B/Employment)
- ✅ Job posting content saves in database (expired links)
- ✅ Table view with sorting and filtering works
- ✅ Bulk deletion of applications works
- ✅ CORS works - frontend communicates with backend without errors
- ✅ Error handling returns readable errors (validation, 404, 500)
- ✅ Motivation badge system works

**End-to-end test (5 minutes):**

```bash
# Terminal 1: Backend
cd applikon-backend
./mvnw spring-boot:run

# Terminal 2: Frontend
cd applikon-frontend
npm run dev

# Browser: http://localhost:5173
1. Add 3 applications (Google/PLN gross B2B, Meta/USD net Employment, Amazon/EUR gross B2B)
2. Go to CV → upload 2 CVs (CV_Java.pdf, CV_React.pdf)
3. Assign CV_Java to Google, CV_React to Meta
4. Drag Google from "Sent" to "In process" → select "HR Interview"
5. On card click dropdown → change stage to "Technical Interview"
6. Open Google details → add note "Questions": "Spring Boot, Docker"
7. Add note "Feedback": "Positive, invited to next stage"
8. Drag Google to "Completed" → select "Offer"
9. Drag Meta to "Completed" → select "Rejection" → "No response"
10. Check badge widget
11. Go to "List" view → sort by company → filter "Offers"
12. Select Amazon → click "Delete selected"
13. Refresh page (F5)
14. Verify: Google in "Completed" with ✓, Meta with ✗ and "No response", Amazon deleted

# Success: MVP works!
```

---


## FINAL ARCHITECTURE

### Backend (Spring Boot 3.4, Java 21)

```
applikon-backend/
├── src/main/java/com/applikon/
│   ├── controller/
│   │   ├── ApplicationController.java
│   │   ├── CVController.java
│   │   ├── NoteController.java
│   │   └── StatisticsController.java
│   ├── service/
│   │   ├── ApplicationService.java
│   │   ├── CVService.java
│   │   ├── NoteService.java
│   │   └── StatisticsService.java
│   ├── repository/
│   │   ├── ApplicationRepository.java
│   │   ├── CVRepository.java
│   │   ├── NoteRepository.java
│   │   └── StageHistoryRepository.java
│   ├── entity/
│   │   ├── Application.java
│   │   ├── ApplicationStatus.java (enum)
│   │   ├── CV.java
│   │   ├── CVType.java (enum)
│   │   ├── Note.java
│   │   ├── NoteCategory.java (enum)
│   │   ├── RejectionReason.java (enum)
│   │   ├── SalaryType.java (enum)
│   │   ├── SalarySource.java (enum)
│   │   ├── ContractType.java (enum)
│   │   └── StageHistory.java
│   ├── dto/
│   │   ├── ApplicationRequest.java
│   │   ├── ApplicationResponse.java
│   │   ├── NoteRequest.java
│   │   ├── NoteResponse.java
│   │   ├── StageUpdateRequest.java
│   │   ├── StatusUpdateRequest.java
│   │   ├── BadgeResponse.java
│   │   └── BadgeStatsResponse.java
│   ├── config/
│   │   └── CorsConfig.java
│   ├── exception/
│   │   └── GlobalExceptionHandler.java
│   └── ApplikonApplication.java
└── uploads/cv/  (CV file storage)
```

### Frontend (React 18, Vite)

```
applikon-frontend/
├── src/
│   ├── App.jsx              (main component, routing, state)
│   ├── KanbanBoard.jsx      (Kanban board with drag & drop)
│   ├── ApplicationCard.jsx  (application card)
│   ├── ApplicationTable.jsx (table view)
│   ├── CVManager.jsx        (CV management)
│   ├── NotesList.jsx        (notes list)
│   ├── BadgeWidget.jsx      (badge widget)
│   ├── services/
│   │   └── api.js           (API communication)
│   └── *.css                (styles)
└── index.html
```

### Database (PostgreSQL)

```sql
-- Tables:
applications (id, company, position, link, salary_min, salary_max, currency,
              salary_type, contract_type, salary_source, source, status,
              job_description, agency, cv_id, current_stage, rejection_reason,
              rejection_details, applied_at)

cvs (id, type, file_name, original_file_name, file_path, file_size,
     external_url, uploaded_at)

notes (id, content, category, application_id, created_at)

stage_history (id, application_id, stage_name, completed, created_at, completed_at)
```
