# 2.0.0 — Screening Companion

## 1. Problem

v1 records what the candidate does: applications, Kanban, notes, CVs. It does not
help them get through the recruitment process.

The first painful moment after applying is the **screening call**. An HR recruiter
calls, often without warning, and asks the same handful of questions: tell me
about yourself, why are you changing jobs, what salary do you expect, what is
your notice period. Juniors rarely know what is coming, so they improvise badly
under pressure.

There is a second, quieter problem. Boards fill up with **dead cards**.
Applications sit in `SENT` for weeks, most companies never reply, and the board
stops reflecting reality.

This release addresses those two moments and nothing else. It runs on the
existing v1 monolith: no new technology, no AI, no new infrastructure.

## 2. Solution

**A screening cheat sheet**, in two parts.

*"My answers"* is global and written by the user. One page holds a template of
the standard screening questions, each with a text field: tell me about yourself,
why are you changing jobs, describe a project, salary expectations. The template
itself is the value, because it tells a junior which questions to expect. The app
generates nothing here. The experience and the motivation are the user's own.

*The cheat sheet view* is per application. It assembles what already exists and
adds one company-specific field:

1. the salary the user proposed in **this** application (stored since v1, and
   three weeks later nobody remembers what they typed into the form),
2. a per-application **"What do you know about this company"** note, edited
   inline,
3. the global "My answers", read-only with a link to edit them.

So every application shows the global answers plus its own company note. Most of
the prep is written once; only the company-specific part repeats. When the
recruiter calls out of nowhere, the candidate opens the application and
everything is on one screen.

"What do you know about the company" is deliberately **not** global, because the
answer is different for every company.

**Board cleanup.** An application sitting in `SENT` for more than 60 days is
almost certainly dead. The UI suggests archiving it as `REJECTED` with the reason
`NO_RESPONSE`, in one click. Both enum values exist since v1.

## 3. Out of scope

- **Scheduled e-mails or notifications.**
- **Any new dependency, module split, or infrastructure.** This release builds on
  the v1 monolith as it is.
- **A separate architecture document.** The only new resource is "My answers",
  fully described in the implementation plan, and the release adds no new
  technology. There is nothing left to design.

## 4. Done when

- The global "My answers" page lets the user fill and edit the standard template
  of four questions, and add custom ones.
- The per-application cheat sheet shows the proposed salary, the per-application
  company note (editable inline), and the global answers on one screen, with a
  link to edit them.
- Applications stuck in `SENT` for more than 60 days get a one-click archive
  suggestion.
