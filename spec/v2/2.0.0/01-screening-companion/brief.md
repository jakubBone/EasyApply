# Applikon 2.0.0 — Screening Companion

# 1. Problem

v1 records what the candidate does — applications, Kanban, notes, CVs — but it does
not help them *get through* the recruitment process. The first painful moment after
applying is the **screening call**: an HR recruiter calls (often unexpectedly) or
schedules a short call asking the same handful of questions — *"tell me about
yourself", "why are you changing jobs", "salary expectations", "notice period"*.
Juniors often don't know what to expect and improvise badly under pressure.

A second, quieter problem: boards fill with **dead cards**. Applications sit in
`SENT` for weeks; most companies never respond, so the board stops reflecting
reality.

v2 addresses exactly these two moments — and nothing else. It ships entirely on the
existing v1 monolith, with **no new technology, no AI, and no new infrastructure**.

---

# 2. User

Same as v1: Polish IT candidates (junior/mid) applying to 10–20 jobs per month,
almost exclusively through job boards (pracuj.pl, justjoin.it, nofluffjobs). They
state their salary expectation in the board's form (their own proposal). Screening
calls can come at any time; most applications end in silence.

---

# 3. Features

## 3.1 Screening cheat sheet

**Moment:** the unexpected HR call (or a scheduled HR screening — same content).

**a) "My answers" — global, per user, written by the user.**
A page with a template of the standard *global* screening questions, each with a text
field: tell me about yourself · why are you changing jobs · briefly describe a project ·
salary expectations. The value is the **template itself** — it tells the junior which
questions to expect. The app generates nothing: the experience and motivation are the
user's own. *"What do you know about the company" is deliberately NOT global* — it is
per-application (see below), because the answer differs for every company.

**b) "Cheat sheet" view — per application, composition + one per-application field.**
One screen in application details that assembles what already exists, plus the single
company-specific note:

1. the **salary the user proposed in THIS application** (stored since v1 — three
   weeks later nobody remembers what they typed into the form),
2. a **per-application "What do you know about this company"** field
   (`Application.companyResearch`), edited inline right in the cheat sheet,
3. the **global "My answers"** (read view, with an edit link).

So every application shows the **global answers + its own company note**: most of the
prep is written once, only the company-specific part is per application.

Scenario: the recruiter calls out of nowhere → open the application → everything is
on one screen. The call stops being an ambush.

## 3.2 Board cleanup

**Moment:** silence. An application sitting in `SENT` for more than ~60 days is
almost certainly dead.

- The UI suggests archiving such applications as `REJECTED` / `NO_RESPONSE` (enum
  exists since v1) with one click.
- Keeps the Kanban honest and the board clean.

---

# 4. Out of scope for v2

Deliberately excluded — v2 is the smallest release that delivers real value:

- **Scheduled e-mails / notifications.**
- **Any new dependency, module split, or infrastructure.** v2 builds on the v1
  monolith as-is.
- **No separate `architecture.md`:** the only new resource ("My answers") is fully
  specified in [`implementation-plan.md`](implementation-plan.md), and v2 adds no new technology — there is
  nothing left to design.

---

# 5. Success Criteria

v2 is successful when:

- ✅ The global "My answers" page lets the user fill and edit the standard
  screening-question template (4 global questions + custom).
- ✅ The per-application cheat-sheet view composes the proposed salary + a
  per-application "what do you know about this company" field (edited inline) + the
  global "My answers" on one screen, with an edit link.
- ✅ Stale applications (>60 days in `SENT`) get a one-click archive suggestion.
