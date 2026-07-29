# Applikon 2.2.0 — User Stories

> Stories, edge cases, and acceptance criteria for the question kind.
> Source of the feature: [`brief.md`](brief.md).

---

## 1. Marking a question

**US-1.1** — As a candidate, I want to mark a question as screening or technical
when I add it, so my cheat sheet is sorted from the moment I write it down.

**Acceptance criteria**
- Every question has exactly one kind: **`SCREENING`** or **`TECHNICAL`**. There
  is no third value and no "unset" — a question always has a kind.
- The control is present wherever a question is created or edited, in **both
  scopes**: the user's global "My answers" set and the per-application set.
- The default is **`SCREENING`**. Adding a question without touching the control
  produces a screening question — the common case costs zero clicks.
- Changing the kind of an existing question is a normal edit, saved like any other
  change to that question.

**Edge cases**
- A question the user classified wrongly is re-classified by editing it. There is
  no separate "move" action to learn.
- The kind is set by the user and **never inferred**. The app does not guess, does
  not suggest, and does not silently re-classify anything.

---

## 2. Using the cheat sheet

**US-2.1** — As a candidate on a screening call, I want to see only the screening
questions, so I find "notice period" without scrolling past technical answers.

**Acceptance criteria**
- The cheat sheet presents the two kinds as **separate groups**, not one list with
  labels — the point is to *not* read the other group.
- Switching between them is **one action** and does not reload or lose the user's
  place in the application.
- A group with no questions says so explicitly, in a way that offers adding one.
  It is never a blank area the user has to interpret.
- The exact visual design (tabs, segmented control, or sections) lands in
  [`implementation-plan.md`](implementation-plan.md); the requirement is that the
  wrong group is **out of the way**, not merely marked.

**Edge cases**
- An application with only screening questions still shows the technical group,
  empty — so the candidate can tell the difference between *"nothing here"* and
  *"this feature does not apply to me"*.
- The chosen group does not have to persist between applications. Each application
  opens on screening, the common case.

---

## 3. Questions that already exist

**US-3.1** — As a candidate who has been using Applikon for months, I want my
existing questions to keep working exactly as before, so an upgrade never costs
me data or a cleanup session.

**Acceptance criteria**
- Every question created before 2.2.0 becomes **`SCREENING`** — set by the
  column's default, so no data is rewritten and no row is touched.
- All existing questions remain visible, editable, and in their original order.
- No user is asked to classify a backlog. If the user wants their old technical
  questions moved, they edit them one at a time, when it suits them.

**Edge cases**
- A user with a mixed backlog sees everything under screening at first. That is
  correct-by-default, not a bug: it is exactly where those questions were
  yesterday.

---

## 4. Data lifecycle (GDPR)

**Acceptance criteria**
- The kind is **part of the question**, which is user-written data. It is included
  in the data export alongside the question and its answer, and removed with the
  account — same policy as the answer itself.
- No new table, no new personal data, no new external recipient.
