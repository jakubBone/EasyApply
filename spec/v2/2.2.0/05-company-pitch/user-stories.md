# 2.2.0 — User Stories

## 1. The pitch

**US-1.1** — As a candidate, I want one generated answer to "What do you know
about us?", so that I can say something specific on a screening call instead of
reading four facts and composing the answer myself.

**Acceptance criteria**
- Generating a brief for a company produces a single field, `pitch`, in Polish
  and English, written as something to say rather than as a company profile.
- The text names something concrete about the company — its product, market,
  technology, or a recent move. Generic filler that would fit any employer is a
  failed generation, not a passing one.
- The pitch answers "what do you know about the company," not "why did you
  apply here." It does not reach for personal motivation.
- Only the company name is sent to the model, exactly as before.
- When there is not enough public information, the field says so instead of
  guessing, the same as in 2.1.0.

**Edge cases**
- A company with almost no web presence returns the "not enough public info"
  state, and the editor still offers the delete action so the user can retry
  later.
- A very long generated text is capped by the same 4000-character limit the edit
  path already enforces.

---

**US-1.2** — As a candidate, I want the pitch to be the one and only place that
answers "what do you know about us," so that I am not looking at the same
question twice under two different names.

**Acceptance criteria**
- "About the company" has no built-in question of its own besides the pitch —
  there is no separate "What do you know about us?" row.
- The pitch carries a visible label, "✨ What do you know about the company," in
  the read view and in the editor. Same label, same field, everywhere it shows.
- A candidate who wants to write their own version edits the pitch directly; the
  edit replaces the generated text and is marked as theirs.
- Adding a custom question in "About the company" still works as before — this
  only removes the built-in duplicate, not the ability to add more questions.

**Edge cases**
- Before a brief is ever generated, the editor shows no pitch field at all — the
  section only offers the "Generate" action, same as an application with no
  brief yet.

---

**US-1.3** — As a candidate, I want to correct the generated pitch by hand, so
that it says what I would actually say.

**Acceptance criteria**
- The pitch is editable in the "About the company" editor, under its label.
- An edit is stored for every language, so switching the interface language keeps
  showing my text.
- An edited pitch is marked as mine and is included in the data export.
- Opening the editor and saving without touching the pitch does not mark it as
  mine.

**Edge cases**
- Clearing the pitch to an empty string is an empty answer of mine, not a gap in
  public data, and reads as "-" rather than "not enough public info".

---

**US-1.4** — As a candidate, I want to delete a brief from the editor, so that I
can generate a fresh one when the old one is wrong or out of date.

**Acceptance criteria**
- The pitch field in the "About the company" editor carries a remove control
  (✕), the same pattern every other question row uses — not a separate button in
  the section header.
- Removing it asks for confirmation first, and the confirmation says that the
  brief is shared by every application to this company.
- Confirming closes the editor and returns to the read view, which now offers
  the "Generate" action again; generating produces a new brief.
- Deleting a brief never touches the other questions or their answers.

**Edge cases**
- The brief is cached per company, so deleting it from one application removes it
  from every application to that company. This is stated in the confirmation, not
  discovered afterwards.
- Deleting a brief that I had edited also deletes my text, and that text then
  leaves the data export. The confirmation says so when the brief carries an edit.
- Deleting while a generation is still running leaves nothing behind, and a new
  generation can be started immediately.
- Cancelling the confirmation leaves the editor open with the pitch untouched.

## 2. Deleting other questions

**US-2.1** — As a candidate, I want to remove any question, including the
built-in ones in "General," so that my cheat sheet holds only what I use.

**Acceptance criteria**
- Every question row in both editors has a remove button, whether it is built in
  or one I added.
- A removed question is gone after saving, in both the editor and the read view.
- Removing a question never affects the other scope. A question removed from
  "General" stays gone for every application, and a custom question removed from
  an application's "About the company" affects only that application.

**Edge cases**
- Removing every built-in question in "General" and saving leaves it empty. The
  built-in questions come back the next time that editor is opened, because an
  empty set cannot be told apart from one that was never filled in. Keeping at
  least one question of my own keeps them away.
- A question added with an empty label is dropped on save, as it already is
  today.

---

**US-2.2** — As a candidate, I want to be asked before deleting a question I have
answered, so that I do not lose text I wrote by one misclick.

**Acceptance criteria**
- Removing a row whose answer is not empty asks for confirmation.
- Removing an empty row happens immediately, with no prompt.
- Cancelling the prompt leaves the row untouched.

**Edge cases**
- The check reads the answer as it is in the editor at that moment, so text typed
  and not yet saved is protected too.

## 3. The question template

**US-3.1** — As a candidate, I want the cheat sheet to start with only the
questions that matter, so that I am not looking at cards I will never fill in.

**Acceptance criteria**
- "General" starts with two questions: "Tell us about yourself" and "Why are you
  changing jobs?".
- "About the company" starts with the pitch and my salary, and nothing else
  until I add a custom question myself.
- Adding my own questions works the same as before in both scopes.

**Edge cases**
- "Tell us about your project" and anything answered under it are deleted by the
  migration. The deletion is explicit, immediate and permanent.

## 4. Reading the cheat sheet

**US-4.1** — As a candidate, I want the "About the company" block to fit on my
phone, so that I can find an answer during a call without scrolling.

**Acceptance criteria**
- The pitch clamps to about three lines and expands on demand.
- The block holds the salary, the labeled pitch, and whatever custom questions I
  added — nothing else.
- The same layout applies on the application details screen and on the cheat
  sheet screen, because both use the same components.
