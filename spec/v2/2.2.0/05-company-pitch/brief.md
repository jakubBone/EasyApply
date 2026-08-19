# 2.2.0 — Company Pitch

## 1. Problem

The 2.1.0 brief answers a question nobody asks. It returns four researched fields
about the company: industry, product and customers, tech stack, size and stage.
On a screening call the recruiter does not ask how big the company is or who its
customers are. They ask one thing: **"what do you know about us?"** The candidate
has four encyclopedia entries and still has to compose the answer in their head,
mid-call.

The four fields are also anything a candidate could google in thirty seconds.
The feature spends an AI call to produce information that was never scarce, and
the result is a research summary rather than something to say out loud.

The cost lands on the screen. The "About the company" block renders the salary,
four brief fields, a separate fixed "What do you know about us?" question that
asks the same thing again, and any custom questions. That is seven or eight
cards, all styled the same, all competing for attention at the exact moment when
scrolling costs the most. The "General" block adds three more fixed questions on
top.

On top of that, none of the fixed questions can be removed. A candidate who does
not want "Tell us about your project" is stuck with an empty card on every cheat
sheet, forever.

## 2. Solution

**One generated field instead of four.** The brief collapses to a single field,
`pitch`: the candidate's answer to "what do you know about the company," written
as something to actually say, not as a research dossier. The prompt targets that
one question directly. Only the company name still enters the prompt, so the
data leaving the system does not change.

**The pitch is the answer, not a research summary next to the answer.** 2.1.0
and an earlier draft of this release kept the AI text and the "What do you know
about us?" question as two separate fields — one researched, one for the
candidate to fill in. In practice the two are indistinguishable to look at and
say the same thing twice on the same screen. There is no separate built-in
company question. The pitch **is** the "what do you know about us" field:
generated first, editable directly, in the read view and the editor under the
same visible label. Editing it replaces the model's words with the candidate's
own; there is exactly one thing to read, not two things pretending to be
different.

**The pitch stays about the company, not about the candidate's motive.** The
question a recruiter asks is "what do you know about us," not "why did you
apply here." The prompt targets the first, the classic company-knowledge
answer: what the company does, its product or service, its market, what sets it
apart — concrete and specific, the same territory a well-prepared candidate
covers unprompted. It does not reach for "why I applied," which is a different,
personal question. A candidate who wants to prep that too adds it as a custom
question, same as any other.

**The brief can be deleted.** A delete action removes the brief for that
company. It lives in the "Add/Edit" editor, next to the pitch, as the same
✕-to-remove control every other question row gets — not as a separate button in
the section header. Deleting and generating again is how a brief is refreshed,
which also settles the regeneration question left open in 2.1.0: regeneration
cannot collide with a user edit, because deleting is something the user does on
purpose.

**Every other question is deletable too, including built-in ones.** The remove
button appears on every row in both "General" and the custom questions a
candidate adds to "About the company." Deleting a question that has an answer
asks for confirmation first, because there is no undo.

**Fewer built-in questions.** "General" keeps two: "Tell us about yourself" and
"Why are you changing jobs?". "About the company" keeps none of its own besides
the pitch — a candidate can still add custom questions there. "Tell us about
your project" is retired, and a migration deletes it along with anything
answered under it, done in the open rather than by letting the rows fall out of
the next save.

**The pitch is visually labeled, not headerless.** An earlier draft rendered it
as unlabeled prose so it would not look like a repeat of a question sitting
right below it. Once the question is gone there is nothing left to repeat, so
the pitch gets a small label ("✨ What do you know about the company") in both
the read view and the editor — the same label, the same field, everywhere it
appears. It still clamps to about three lines with an expand control, so the
section fits a phone screen.

## 3. Out of scope

- **Generating interview questions.** Reading a job ad and proposing what will be
  asked is a different feature that pays off only with a model reading the whole
  question bank. It belongs to the v3 era.
- **Per-offer briefs.** A brief is cached per company, and an offer-aware version
  needs a different key and its own justification for the data it sends.
  ADR-v2-003 parks this deliberately and nothing here reopens it.
- **Automatic regeneration.** A stale brief is not detected and nothing refreshes
  on its own. The user deletes (from the editor) and generates again.
- **A dedicated regenerate action.** Delete-then-generate covers it; a distinct
  endpoint or button is unnecessary abstraction over two calls the frontend
  already makes.
- **Soft delete or an undo.** Deleting stays permanent, as everywhere else in the
  app. The confirmation is the safety net.
- **Restoring a deleted built-in question.** Once removed, a built-in question is
  gone like any other. Adding it back is a custom question with the same text.
- **A separate "why I applied" field.** That is a different, personal question
  from "what do you know about us." A candidate who wants it adds it as a custom
  question.
- **Rescuing the four old fields into the new one.** Generated text is derived
  public data and is thrown away. Only text the user edited by hand survives the
  migration, because that text is theirs and is part of the data export.
- **Keeping answers to the retired "project" question.** They go with it. There
  is no undo and no export of them beforehand.

## 4. Done when

- Generating a brief produces one field, `pitch`, that answers "what do you know
  about the company" with concrete facts, in Polish and English.
- The pitch is the only "what do you know about us" field in "About the
  company" — there is no separate built-in question duplicating it.
- The pitch carries a visible label ("✨ What do you know about the company"), the
  same in the read view and the editor.
- A brief can be deleted from the editor (not the section header), and
  generating again after a delete produces a fresh one.
- Every other question can be removed in both scopes, and removing an answered
  one asks first.
- "General" starts with two built-in questions; "About the company" starts with
  none besides the pitch, and the retired "project" question is gone from the
  database rather than lingering unreachable.
- The "About the company" block fits on a phone screen without scrolling past
  the first two cards to reach an answer.
