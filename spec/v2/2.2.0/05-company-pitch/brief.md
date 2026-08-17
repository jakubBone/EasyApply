# 2.2.0 — Company Pitch

## 1. Problem

The 2.1.0 brief answers a question nobody asks. It returns four researched fields
about the company: industry, product and customers, tech stack, size and stage.
On a screening call the recruiter does not ask how big the company is or who its
customers are. They ask one thing: **"what do you know about us, and why us?"**
The candidate has four encyclopedia entries and still has to compose the answer
in their head, mid-call.

The four fields are also anything a candidate could google in thirty seconds.
The feature spends an AI call to produce information that was never scarce, and
the result is a research summary rather than something to say out loud.

The cost lands on the screen. The "About the company" block renders the salary,
four brief fields, the fixed "What do you know about us?" question, and any
custom questions. That is seven or eight cards, all styled the same, all
competing for attention at the exact moment when scrolling costs the most. The
"General" block adds three more fixed questions on top.

On top of that, none of the fixed questions can be removed. A candidate who does
not want "Tell us about your project" is stuck with an empty card on every cheat
sheet, forever.

## 2. Solution

**One generated field instead of four.** The brief collapses to a single field,
`pitch`: a few sentences the candidate can actually say when asked what they know
about the company and why they applied. The prompt targets that question directly
instead of asking for a company profile. Only the company name still enters the
prompt, so the data leaving the system does not change.

**The brief can be deleted.** A new delete action removes the brief for that
company. Deleting and generating again is how a brief is refreshed, which also
settles the regeneration question left open in 2.1.0: regeneration cannot
collide with a user edit, because deleting is something the user does on purpose.

**Every question is deletable, including the built-in ones.** The remove button
appears on every row. Deleting a question that has an answer asks for
confirmation first, because there is no undo.

**Fewer built-in questions.** "General" keeps two: "Tell us about yourself" and
"Why are you changing jobs?". "About the company" keeps none at all, holding the
generated pitch and whatever the candidate adds. Questions already answered under
the retired keys keep showing, keep their text, and can now be removed by hand.

**The pitch does not look like a question.** It is the one block of prose among
short answers, so it gets its own style and clamps to about three lines with an
expand control, instead of pushing everything below it off the screen.

## 3. Out of scope

- **Generating interview questions.** Reading a job ad and proposing what will be
  asked is a different feature that pays off only with a model reading the whole
  question bank. It belongs to the v3 era.
- **Per-offer briefs.** A brief is cached per company, and an offer-aware version
  needs a different key and its own justification for the data it sends.
  ADR-v2-003 parks this deliberately and nothing here reopens it.
- **Automatic regeneration.** A stale brief is not detected and nothing refreshes
  on its own. The user deletes and generates again.
- **Soft delete or an undo.** Deleting stays permanent, as everywhere else in the
  app. The confirmation is the safety net.
- **Restoring a deleted built-in question.** Once removed, a built-in question is
  gone like any other. Adding it back is a custom question with the same text.
- **Rewriting the pitch for a specific role.** The pitch is about the company, not
  about the match between the candidate and one job ad.
- **Rescuing the four old fields into the new one.** Generated text is derived
  public data and is thrown away. Only text the user edited by hand survives the
  migration, because that text is theirs and is part of the data export.

## 4. Done when

- Generating a brief produces one field that answers "what do you know about us,
  and why us?", in Polish and English.
- A brief can be deleted, and generating again after a delete produces a fresh
  one.
- Every question can be removed in both scopes, and removing an answered one asks
  first.
- "About the company" starts with no built-in questions and "General" with two,
  while every answer written before this release is still visible and still
  editable.
- The "About the company" block fits on a phone screen without scrolling past the
  first two cards to reach an answer.
