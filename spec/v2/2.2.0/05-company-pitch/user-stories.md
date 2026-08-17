# 2.2.0 — User Stories

## 1. The pitch

**US-1.1** — As a candidate, I want one generated answer to "What do you know
about us?", so that I can say something specific on a screening call
instead of reading four facts and composing the answer myself.

**Acceptance criteria**
- Generating a brief for a company produces a single field, in Polish and
  English, written as something to say rather than as a company profile.
- The text names something concrete about the company. Generic filler that would
  fit any employer is a failed generation, not a passing one.
- Only the company name is sent to the model, exactly as before.
- When there is not enough public information, the field says so instead of
  guessing, the same as in 2.1.0.

**Edge cases**
- A company with almost no web presence returns the "not enough public info"
  state, and the section still offers the delete action so the user can retry
  later.
- A very long generated text is capped by the same 4000-character limit the edit
  path already enforces.

---

**US-1.2** — As a candidate, I want to correct the generated pitch by hand, so
that it says what I would actually say.

**Acceptance criteria**
- The pitch is editable in the "About the company" editor.
- An edit is stored for every language, so switching the interface language keeps
  showing my text.
- An edited pitch is marked as mine and is included in the data export.
- Opening the editor and saving without touching the pitch does not mark it as
  mine.

**Edge cases**
- Clearing the pitch to an empty string is an empty answer of mine, not a gap in
  public data, and reads as "-" rather than "not enough public info".

---

**US-1.3** — As a candidate, I want to delete a brief, so that I can generate a
fresh one when the old one is wrong or out of date.

**Acceptance criteria**
- The "About the company" section offers a delete action whenever a brief exists.
- Deleting asks for confirmation first, and the confirmation says that the brief
  is shared by every application to this company.
- After deleting, the section shows the generate button again, and generating
  produces a new brief.
- Deleting a brief never touches the questions or their answers.

**Edge cases**
- The brief is cached per company, so deleting it from one application removes it
  from every application to that company. This is stated in the confirmation, not
  discovered afterwards.
- Deleting a brief that I had edited also deletes my text, and that text then
  leaves the data export. The confirmation says so when the brief carries an edit.
- Deleting while a generation is still running leaves nothing behind, and a new
  generation can be started immediately.

## 2. Deleting questions

**US-2.1** — As a candidate, I want to remove any question, including the
built-in ones, so that my cheat sheet holds only what I use.

**Acceptance criteria**
- Every question row in both editors has a remove button, whether it is built in
  or one I added.
- A removed question is gone after saving, in both the editor and the read view.
- Removing a question never affects the other scope. A question removed from
  "General" stays gone for every application, and one removed from an
  application's "About the company" affects only that application.

**Edge cases**
- Removing every question in a section and saving leaves it empty. The built-in
  questions come back the next time that editor is opened, because an empty set
  cannot be told apart from one that was never filled in. Keeping at least one
  question of my own keeps them away.
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
- "About the company" starts with one question, "What do you know about us?",
  alongside my salary and the generated pitch.
- That question is not a repeat of the pitch. The pitch is what the model found;
  the question is what I will say, and the pitch is the material for it.
- The question is deletable like any other, so it is never hidden while
  unanswered the way it was in 2.1.0. An empty one shows as "-" until I remove it.
- Adding my own questions works the same as before in both scopes.

**Edge cases**
- "Tell us about your project" and anything answered under it are deleted by the
  migration. The deletion is explicit, immediate and permanent.

## 4. Reading the cheat sheet

**US-4.1** — As a candidate, I want the "About the company" block to fit on my
phone, so that I can find an answer during a call without scrolling.

**Acceptance criteria**
- The pitch is visually distinct from the question rows, carries no question
  header, and does not read as a question with an answer under it.
- The pitch shows about three lines and expands on demand.
- The block holds the salary, the pitch, one built-in question and whatever I
  added, and nothing else.
- The same layout applies on the application details screen and on the cheat
  sheet screen, because both use the same components.
