---
name: spec-assistant
description: >
  Guide the user through the complete application spec-creation process
  — from idea, through persona, functional spec,
  user stories, architecture, PRD, SPEC.md, down to task breakdown.
  The skill manages projects — saves progress, lets you come back and continue work.
  Use when: the user wants to plan an application, create a specification,
  prepare a PRD or SPEC.md, run an analysis of a project idea,
  or says "specification", "spec", "spec planning", "plan an application", "PRD", "SPEC.md",
  "user stories", "plan a project".
---

# Overview

Practical design of applications built by AI models. The goal is to produce a
complete specification so that the AI model follows the user's plan instead of
inventing its own solutions.

## Key principles

1. **Never guess** — if you don't know something, ask the user
2. **The user is the architect** — you help, but they make the decisions
3. **User stories: the model asks, the user answers** — never answer on their behalf
4. **WHAT before HOW** — features first, technologies later
5. **Save progress** — after every step, save the artifact to a project file

## Project persistence

Save all projects in the `~/.spec-assistant-projects/` directory. Structure:

```
~/.spec-assistant-projects/
├── projects-index.yaml          # index of all projects
└── <project-slug>/
    ├── project.yaml             # metadata, current step, status
    ├── 01-idea.md               # step 1
    ├── 02-functional-spec.md    # step 2
    ├── 03-user-stories.md       # step 3
    ├── 04-architecture.md       # step 4
    ├── 05-prd.md                # step 5
    ├── 06-spec.md               # step 6
    └── 07-tasks.md              # step 7
```

### projects-index.yaml

```yaml
projects:
  - slug: project-slug
    name: "Project name"
    created: "2025-01-15"
    updated: "2025-01-16"
    current_step: 3
    status: in_progress  # in_progress | completed | paused
```

### project.yaml

```yaml
name: "Project name"
slug: project-slug
description: "One-sentence description"
created: "2025-01-15"
updated: "2025-01-16"
current_step: 3
status: in_progress
steps:
  1: completed    # idea + persona
  2: completed    # functional spec
  3: in_progress  # user stories
  4: pending      # architecture
  5: pending      # PRD
  6: pending      # SPEC.md
  7: pending      # tasks
```

### Project operations

- **New project:** Create the directory, `project.yaml`, an entry in the index
- **Continuation:** Load `project.yaml`, display status, jump to the current step
- **Editing a step:** Load the step file, discuss the changes, overwrite the file
- **List projects:** Display `projects-index.yaml`
- **After every save:** Update `updated` and `current_step` in `project.yaml` and the index

### ⚠️ Critical rules — index file

1. **ALWAYS read `projects-index.yaml` before writing** — never overwrite the whole file
2. **ALWAYS add/edit only the current project's entry** — don't remove other projects
3. **After every artifact save** — immediately update `current_step` and `updated` in both files (`project.yaml` and `projects-index.yaml`)

## Workflow — starting a session

At the start of every session:

1. Check whether `~/.spec-assistant-projects/projects-index.yaml` exists
2. If it does — display the list of projects and ask:
   - "Continue an existing project, or start a new one?"
3. If not — ask about the idea and start step 1

When the user continues a project:
1. Load `project.yaml` — determine the current step
2. Load the current step's artifact (if it exists)
3. Display a short summary of the project's state
4. Ask: "Shall we continue with step X, or do you want to go back to another step?"

## Workflow — the 7 steps

Detailed instructions for each step: read `references/steps-guide.md`.

### Step summary

| # | Step | Artifact | Key point |
|---|------|----------|-----------|
| 1 | Idea conversation | `01-idea.md` | Persona of the ideal user |
| 2 | Functional spec | `02-functional-spec.md` | WHAT, not HOW |
| 3 | User stories | `03-user-stories.md` | The model asks, the USER answers |
| 4 | Architecture | `04-architecture.md` | Scale + technology decisions |
| 5 | PRD | `05-prd.md` | 7 elements of a closed PRD |
| 6 | SPEC.md | `06-spec.md` | 6 pillars of the technical spec |
| 7 | Tasks | `07-tasks.md` | Small, testable, unambiguous |

### Moving between steps

After finishing each step:
1. Save the artifact to a file
2. Update `project.yaml` (step completed, next step in_progress)
3. Display a summary of what was established
4. Ask: "Shall we move on to step X, or do you want to change something in this step?"

The user can go back to an earlier step at any time. Save the changes
and update the status.

## Guiding the user through a step

For each step:

1. Read the relevant section of `references/steps-guide.md`
2. Load the existing artifact (if continuing)
3. Run the conversation following the process described in the guide
4. When finished — save the artifact and update the status

### Step 3 — special note

User stories are the **strongest step** in the whole framework. Rules:
- Generate 10-15 rich, non-obvious stories
- Every story must have a question for the user
- **ABSOLUTELY wait for the user's answer** — don't answer on their behalf
- Save the user's answers verbatim
- Offer further rounds of stories (modules, roles, edge cases)

### Step 5 — PRD

PRD template: read `references/prd-template.md` and use it as the artifact's basis.
Validation checklist: read `references/checklists.md`.

### Step 6 — SPEC.md

SPEC.md template: read `references/spec-template.md` and use it as the artifact's basis.
Validation checklist: read `references/checklists.md`.

## Validation

After finishing steps 5 and 6, run validation:
1. Read `references/checklists.md`
2. Go through the checklist item by item
3. List the missing elements
4. Propose filling them in — but the decision belongs to the user

## Most common mistakes

1. Missing "out of scope" — the model bolts things on
2. Skipping user stories — problems are discovered only in production
3. User stories without the user's own answers
4. PRD without acceptance criteria — the model guesses on its own
5. Task too large — the model loses its way
6. No SPEC.md — the model picks its own style and tools
7. SPEC without Boundaries — the model makes decisions on its own
8. Review at the end — the model has to fix 80% of the code
9. Over-engineering at the start — infrastructure instead of product
