# Spec-assistant — step-by-step guide

## Table of contents

1. [Step 1: Idea conversation](#step-1-idea-conversation)
2. [Step 2: Functional spec](#step-2-functional-spec)
3. [Step 3: User stories](#step-3-user-stories)
4. [Step 4: Architecture](#step-4-architecture)
5. [Step 5: PRD](#step-5-prd)
6. [Step 6: SPEC.md](#step-6-specmd)
7. [Step 7: Task breakdown](#step-7-task-breakdown)

---

## Step 1: Idea conversation

**Goal:** Understand the idea, analyze it, create a persona of the ideal user.

**Process:**
1. Ask the user to describe their application idea
2. Ask probing questions — pros, cons, whether it makes sense
3. Create a persona of the ideal user (name, age, role, frustrations, needs)
4. Step into the persona's shoes and evaluate the idea from their perspective
5. Write down conclusions — what was surprising, what needs clarifying

**Questions to ask the user:**
- Who is this application for?
- What problem does it solve?
- Why don't existing solutions suffice?
- Who is your ideal user?

**Persona — structure:**
- Who they are (name, age, professional role)
- What they do day to day
- What frustrations they have with current tools
- What they're looking for in an ideal solution
- How they'd describe their dream ("I want X, but with Y")

**Step artifact:** `01-idea.md` file with the idea description, persona and analysis conclusions.

---

## Step 2: Functional spec

**Goal:** Write down WHAT the application should do from the user's perspective. No technology — just features.

**Rule:** WHAT, not HOW. No frameworks, languages, databases — that comes in step 4.

**Process:**
1. Ask the user to list all the features
2. Iterate — discuss what will work, what won't, what was missed
3. Go back to the persona from step 1 — "would this be convenient for [persona]?"
4. Write down a closed list of functionality

**Good example:** "The organizer creates an event with a date, description, seat limit and ticket price."
**Bad example:** "Next.js frontend with App Router, Postgres database on Supabase..."

**Questions to ask:**
- What are the application's main features?
- What does the user do after logging in?
- What data do they enter and what results do they get?
- Are there different user roles?
- What notifications/messages does the user receive?

**Step artifact:** `02-functional-spec.md` file with functionality listed and grouped into modules.

---

## Step 3: User stories

**Goal:** Uncover unknown problems, edge cases and design decisions through detailed scenarios.

**Why this is the most important step:**
- We plan in a rush and assume many things are "obvious"
- User stories bring those assumptions into the light
- Every story is a design decision — if you don't make it, the model will decide for you

**Process:**
1. Load the functional spec from step 2
2. Generate 10-15 detailed user stories
3. For each story, ask: "How should the system behave in this situation?"
4. **KEY: The user writes the answers themselves** — not the model!
5. Save the answers — this is design gold
6. Optional: further rounds of stories for specific modules, roles, edge cases

**Story categories to cover:**
- Happy path — standard usage
- Edge cases — unusual data, concurrent access, limits
- Errors — what happens when something fails
- Security / privacy — GDPR, data deletion
- Roles — admin, user, guest — different perspectives
- Scale — what happens with 100x more users

**Key rule:** The model generates the questions. The user writes the answers THEMSELVES. Don't let the model answer on the user's behalf — they are the architect.

**User story vs user flow:**
- User flow = a path map (a movie from A to Z)
- User story = a single need ("As [who] I want [what], so that [why]")
- In the PRD: 3-5 key flows, each with user stories + acceptance criteria

**Step artifact:** `03-user-stories.md` file with stories, questions and the user's answers.

---

## Step 4: Architecture

**Goal:** Choose technologies, define scale, make key technical decisions.

**Process:**
1. Determine the project's scale:
   - Solo/MVP — for me only, skip a lot of things
   - Small team — a few people, auth, basic security
   - Product — many users, security, scalability
2. Discuss technology decisions with the model
3. Document every decision with a "why" justification

**Questions to settle:**
- Why this particular architecture?
- Why this language / framework?
- Can it be simplified?
- What happens if the project grows 10x?
- What are the alternatives?

**Anti-pattern: over-engineering.** The model proposes a full stack, microservices, Kubernetes... For small projects: "How can this be simplified for solo use?"

**Tip:** After choosing the technology, ask for a simple prototype (1 endpoint + 1 screen) to check whether the stack fits.

**Step artifact:** `04-architecture.md` file with technology decisions and justifications.

---

## Step 5: PRD

**Goal:** Create a closed product requirements document — "what is to be built". Closed = no room for guessing.

**7 elements of the PRD:**

### 5.1 Product description
One sentence: what it is and who it's for. Must be concrete — not "an events platform", but a full sentence with context.

### 5.2 Scope — MVP / In scope / Out of scope
- **MVP** — definitely doing
- **In scope** — planned, but not MVP
- **Out of scope** — NOT doing (at least 5 items!)

IMPORTANT: If you don't tell the model what NOT to do — the model WILL do it.

### 5.3 User flows
3-5 main paths from A to Z, with error and edge-case variants.

### 5.4 User stories + acceptance criteria
Every story in the format: "As [who] I want [what], so that [why]" with concrete acceptance criteria.

### 5.5 Definition of Done
When is the WHOLE product (not a story) done? Without a DoD the model will keep "improving" forever.

### 5.6 Non-functional requirements
Non-functional requirements: platform, performance, security, accessibility, GDPR.

### 5.7 Open questions / assumptions
All undecided decisions — written down explicitly. Without this section the AI will make those decisions itself.

**PRD validation checklist — see references/checklists.md**

**Step artifact:** `05-prd.md` file based on the template in `references/prd-template.md`.

---

## Step 6: SPEC.md

**Goal:** Create the technical specification — "how we work". PRD = the contract for the product. SPEC = the rulebook for the work.

**6 pillars of SPEC.md:**

### 6.1 Commands
How to run, build, test. Concrete commands + required versions. Without this the model guesses (npm vs pnpm, jest vs vitest).

### 6.2 Testing
Test strategy: framework, location, mocking rules, when to write tests, CI.

### 6.3 Project Structure
Directory map + import rules. Which folders may import from which.

### 6.4 Code Style
Prefer/Avoid lists. Concrete formatting, naming and pattern rules.

### 6.5 Git Workflow
Branches, commit format (Conventional Commits), PR checklist.

### 6.6 Boundaries — the most important pillar
Three levels:
- **Always** — do without asking (at least 5 rules)
- **Ask First** — stop and ask (at least 5 rules)
- **Never** — hard prohibitions (at least 5 rules)

**SPEC validation checklist — see references/checklists.md**

**Step artifact:** `06-spec.md` file based on the template in `references/spec-template.md`.

---

## Step 7: Task breakdown

**Goal:** Break the PRD down into small, independent tasks and control their delivery.

**Traits of a good task:**
- **Small** — one prompt, one goal
- **Testable** — it's clear how to tell it works
- **Independent** — as far as possible, doesn't depend on other tasks
- **Unambiguous** — the model doesn't have to guess

**Delivery process:**
1. The model does the task
2. You check — does it work? Does it match the SPEC?
3. You correct — small fixes
4. You accept — move on to the next one

**Anti-pattern:** Assigning 10 tasks at once, reviewing at the end. Result: the model builds on bad foundations.

**When to go back to the plan:**
- A new edge case discovered while building
- The technology doesn't hold up in practice
- The scope changed

**Model context for every task:**
- Always: SPEC.md, description of the current task, what's already done
- If needed: PRD, code of related modules, test results

**Iterative variant (for large projects / milestones):**

Instead of a detailed task list up front — plan a general implementation order in phases. The user builds detailed tasks iteratively themselves, phase by phase, since implementation may surface changes that require correcting the plan.

Process:
1. Together with the user, settle the implementation phases (5-8 phases, logical order)
2. Make sure the phase order allows testing — e.g. the admin panel before multi-course support, since course management can't be tested without an admin
3. Save the phases in `07-tasks.md` with statuses
4. The user comes back for detailed tasks per phase in later sessions

**When to use the iterative variant:**
- The project is large (many phases, many changes)
- It's a milestone/extension of an existing project, not greenfield
- The user wants to stay flexible and correct the plan along the way

**Step artifact:** `07-tasks.md` file with the list of tasks/phases, statuses and review notes.
