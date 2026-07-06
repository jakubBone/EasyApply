# Applikon – Job Application Tracker

> *Note: this is the **original product vision**, written at the start of the
> project when it was named **EasyApply**. The product was renamed to
> **Applikon** in [Phase 14](../14-rebrand-applikon/brief.md) (May 2026) — see
> that brief for the rationale. The brand name in this document has been
> updated for consistency, but the vision, problem statement, MVP scope, and
> tech choices remain as originally written.*

# 1. Problem
IT candidates apply to a large number of job offers on various job boards and LinkedIn. 
This process quickly becomes chaotic and difficult to control.

**Most common problems (ranked by priority)**:
- **Losing track of applications:** Difficulty in determining at which stage a particular recruitment process is.
- **Document chaos:** Creating multiple CV versions for different offers/companies; no way to know which version was sent to a particular company.
- **Loss of salary data:** Forgetting what salary rate was provided in the application form, including currency and conditions (e.g., B2B vs employment contract).
- **Scattered notes:** No place to store recruiter contact details, interview questions, feedback, and the text of messages sent in the "recruiter information" field.
- **Ephemeral content:** Job posting links expire, making it impossible to review requirements before an interview.

- **AI barrier:** Company research before an interview takes too much time
- **CV mismatch:** Difficulty in adapting CV to a specific offer to pass through ATS (Applicant Tracking Systems) automatic rejection

**Result:** Lack of control over the process, increased stress before interviews, inability to learn from failures, and wasted time on repeated mistakes.

---

# 2. User
Job candidates actively seeking work, applying to 10-20 offers per month, primarily using LinkedIn and NoFluffJobs/JustJoinIT:
- Career changers from non-IT to IT (without experience)
- Junior/Mid Developers (0-4 years of experience)

---

# 3. Why This Application?
- **Market gap:** A tool designed 100% for candidate needs, not recruiters – unlike LinkedIn or company ATS systems.
- **End-to-end:** Handling from CV submission, through employer research, to archive of completed processes.
- **Convenience:** Single "source of truth" instead of scattered Excel files, Notion, or emails.

**Competitive analysis:**

| Competitor | Weaknesses | Our advantages |
|-----------|------|-----------------|
| Huntr.co | Limited UI, no Polish localization | Polish market, simplicity |
| Teal | Paid ($29/month), no mobile version | Free MVP, IT-focused |
| Notion templates | Requires manual configuration | Ready-made out-of-the-box solution |

---

# 4. MVP (Minimum Viable Product)
1. **Application Registry (CRUD):** Company, position, link, date (auto-generated), salary (with currency), status, offer source.
2. **Kanban View:** Drag applications between columns: *Sent → Interview → Task → Offer → Rejected*.
3. **CV Management:** Upload PDF files (local storage, max 5MB) and assign to applications.
4. **Notes:** Section for technical questions, feedback, contact details (plaintext).

---

# 5. Edge Cases
- **Reapplication:** Notification about previous applications to the same company.
- **Hidden recruitment:** Handling Agency – End client relationships.
- **Expired links:** Automatic saving of pasted job posting content to the database.
- **Salary change:** Tracking history of financial negotiations.
- **Multi-currency:** Support for different currencies (PLN, EUR, USD) without automatic converter.
- **Duplicate offers:** Detection of the same offer on different platforms (by company name + position).

---

# 6. MVP – Business Steps

## Step 1: Backend API

| Aspect | Description |
|--------|------|
| **Goal** | REST API to save and retrieve applications from PostgreSQL database |
| **Why** | Foundation of the app – frontend has nothing to communicate with without a backend |
| **Conditions** | PostgreSQL running (applikon_db), API returns JSON, validation works, CORS configured for localhost:5173 |
| **Success when** | I can add an application via curl/Postman, API returns JSON, data is saved in database and survives server restart |

## Step 2: Frontend List

| Aspect | Description |
|--------|------|
| **Goal** | React UI to view list of applications and add new ones via form |
| **Why** | Solves the main problem – "losing track of applications". One place instead of chaos |
| **Conditions** | Frontend communicates with backend (localhost:8080), data survives page refresh, adding application takes max 1 minute |
| **Success when** | I can add 10 applications via form in browser, all visible in list with key data (company, position, salary, currency, date) |

## Step 3: Application Status Tracking

| Aspect | Description |
|--------|------|
| **Goal** | User can change application status (Sent → Interview → Task → Offer → Rejected) and see it on Kanban view |
| **Why** | Solves "at what stage is the recruitment?" – visual process control |
| **Conditions** | 5 statuses (hardcoded). Change status via drag & drop or select. See how many applications in each status |
| **Success when** | I see the Kanban board, drag cards between columns, status is saved |

## Step 4: CV Management

| Aspect | Description |
|--------|------|
| **Goal** | User can upload CV files (PDF) and assign them to applications |
| **Why** | Solves "which CV version was sent to this company?" |
| **Conditions** | Only PDF, max 5MB. One CV can be assigned to multiple applications. Can view/download CV |
| **Success when** | I upload 3 CV versions, assign different ones to different applications, see which version went where |

## Step 5: Notes and Job Posting Archive

| Aspect | Description |
|--------|------|
| **Goal** | User can add notes to applications (interview questions, feedback, contact details) and save job posting content |
| **Why** | Solves "scattered notes" and "expired job posting links" |
| **Conditions** | Notes plaintext (no formatting). Multiple notes per application. Job posting content as single text field |
| **Success when** | After an interview I save questions and feedback. Before next interview I can read them. Posting is available even when link expired |

---


# 7. TECHNOLOGY

## Libraries

### STDLIB (built-in, preferred):

**Backend (Java 21):**
- `java.util.*`: Collections (List, Map, Set) for in-memory data management
- `java.time.*`: Application date handling (LocalDate, LocalDateTime)
- `java.nio.file.*`: CV file operations (write, read, delete)
- `java.util.UUID`: Generate unique identifiers for CVs

**Frontend (JavaScript/TypeScript):**
- `fetch API`: HTTP communication with backend
- `localStorage`: Optional user data caching

### EXTERNAL (only if stdlib is insufficient):

**Backend:**
- **Spring Boot 3.4**: Web framework (stdlib lacks REST API / dependency injection)
- **Spring Data JPA**: ORM for PostgreSQL communication (stdlib lacks object-relational mapping)
- **PostgreSQL JDBC Driver**: Database driver (required for connection)
- **Hibernate Validator**: Input data validation (stdlib has basic validation, but no Spring integration)
- **Lombok** (optional): Reduce boilerplate (getters, setters, constructors)

**Frontend:**
- **React 18**: UI library (stdlib lacks reactive components)
- **TypeScript**: Static typing (JavaScript lacks types)
- **Tailwind CSS**: Utility-first CSS (stdlib lacks ready-made styles)
- **@dnd-kit/core**: Drag & drop for Kanban (stdlib lacks native DnD in React)
- **React Router**: Routing between views (stdlib lacks SPA routing)

**Database:**
- **PostgreSQL 16**: Relational database (stdlib lacks database)

---

# File Structure (minimal, for MVP)

## Backend (`src/main/java/com/applikon/`)

```
├── controller/
│   └── ApplicationController.java       # REST API endpoints (CRUD applications)
├── service/
│   ├── ApplicationService.java          # Business logic for applications
│   └── CVStorageService.java            # CV file management (upload, download, delete)
├── repository/
│   ├── ApplicationRepository.java       # Spring Data JPA repository for applications
│   └── NoteRepository.java              # Repository for notes
├── entity/
│   ├── Application.java                 # Application entity (company, position, status, salary)
│   ├── Note.java                        # Note entity (text, date, relation to application)
│   └── ApplicationStatus.java           # Enum (SENT, INTERVIEW, TASK, OFFER, REJECTED)
└── dto/
    ├── ApplicationRequest.java          # DTO for creating/editing applications
    └── ApplicationResponse.java         # DTO for returning application data
```

## Frontend (`src/`)

```
├── components/
│   ├── KanbanBoard.tsx                  # Kanban board with status columns
│   ├── ApplicationCard.tsx              # Application card (draggable)
│   ├── ApplicationForm.tsx              # Form for adding/editing applications
│   ├── CVUpload.tsx                     # CV upload component
│   └── NotesList.tsx                    # List of notes for application
├── services/
│   └── api.ts                           # Fetch functions for backend communication
├── types/
│   └── application.ts                   # TypeScript interfaces (Application, Note, Status)
├── pages/
│   ├── Dashboard.tsx                    # Main view (Kanban + list)
│   └── ApplicationDetails.tsx           # Application details (CV, notes, history)
└── App.tsx                              # Root component with routing
```

## Database (PostgreSQL)

```
└── schema.sql
    ├── applications table               # id, company, position, link, date, salary, currency, status, source
    ├── notes table                      # id, application_id, content, created_at
    └── cv_files table                   # id, filename, file_path, upload_date, application_id (nullable)
```

---

# 8. Future

| Phase | Scope |
|------|--------|
| **v1.1** | AI features – interview preparation, CV vs job posting analysis |
| **v2.0** | Architecture (optional, educational) – event-driven, microservices |


| Choice | Justification |
|-------|--------------|
| Spring Security + OAuth2 | Login/authorization |
| Session-based | Simpler than JWT for app with single backend |
| pg_vector | v1.1 | Embeddings for AI |
| Spring AI + Ollama/Groq | v1.1 | AI features |
| Kafka, microservices | v2.0 | Architecture learning (optional) |
