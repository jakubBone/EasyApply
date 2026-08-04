# 2.1.0 — User Stories

## 1. Generating a brief on demand

**US-1.1** — As a candidate, I want to generate a company brief with one click on
an application, so the research is ready when I want it: right after applying, or
minutes before a call.

**Acceptance criteria**
- The brief is generated **only** when the user clicks. A "Generate brief" button
  sits in the "About the company" section header, next to the existing Add/Edit
  action, and is visually distinctive as the AI action. Nothing fires
  automatically.
- The button is available on every application without a brief, including
  applications created before this release.
- Generation runs in the background. The rest of the app is never slowed down or
  blocked by it.
- What is sent to the AI provider: **the company name, and the job-ad link
  (`Application.link`, which exists since v1) when present. Nothing else.** No
  job description, no notes, no salary, no user data.
- The brief has four fields: industry, product and customers, tech stack, size
  and stage.
- A field without enough public data says so explicitly. It is shown rather than
  hidden, and never filled with a guess.
- A brief is kept **per user and company**. Clicking the button on a second
  application to the same company reuses the existing brief with no new AI call.
  Different users each generate their own.

**Edge cases**
- The same company spelled differently, such as "Comarch" and "Comarch S.A.",
  produces two briefs. Accepted, because there is no fuzzy matching.
- A generated brief is final, apart from retrying a failure. It never
  regenerates, even if the user later changes the company name or adds the
  job-ad link.

> Superseded in part: the job-ad link was dropped from the prompt during the
> build. See [ADR-v2-003](../../../adr/ADR-v2-003-drop-job-ad-link-from-brief-prompt.md).

## 2. Status and failures

**US-2.1** — As a candidate, I want to see honestly whether the brief is ready,
still generating, or failed, so the cheat sheet never shows me an empty section
that looks finished.

**Acceptance criteria**
- Before generation, the section shows the "Generate brief" button and no empty
  brief fields.
- While generating, the section shows a "generating…" state with a spinner.
- On failure, including a provider outage or an exhausted quota, the section
  shows an error message and a "try again" button. The wording may suggest
  trying later.
- Retry is manual only. There is no automatic retry, no queue and no scheduler.
- A ready brief never regenerates. Regeneration burns quota, so "try again"
  exists only for the failed state.

## 3. Where the brief lives, and editing it

**US-3.1** — As a candidate, I want the brief inside the application's "About the
company" section, next to "What do you know about us?", and edited only there, so
all company prep stays on one screen.

**Acceptance criteria**
- On a successful generation, or when an existing brief is reused, the four
  fields appear in the "About the company" section as editable entries, with the
  same shape and edit modal as the existing per-application questions.
- Editing a field updates the **company's** brief. Because a brief is kept once
  per company, the correction is there next time the user opens any application
  to that company. The brief improves as the user refines it.
- The layout must stay readable, because this section is what the candidate reads
  during a call. The exact visual design is decided in the implementation plan.

**Edge cases**
- Deleting an application leaves the company brief and the user's edits in place
  for future applications. A brief is removed only with the account.

## 4. Language

**US-4.1** — As a candidate using the app in Polish or English, I want the brief
in my app language, and if I switch the language the brief follows.

**Acceptance criteria**
- **One AI call generates every language** of every field. It is a single
  request, because free-tier limits count requests, and all languages are stored
  with the brief.
- The UI shows the version matching the current app language and switches
  instantly with it.
- **User edits are the user's own text and are never machine-translated.** An
  edited field shows the same user text in every language: the edit wins over the
  generated versions. During a call the user sees one truth, their own, and
  per-language edits would add mechanics without value.

## 5. Data lifecycle (GDPR)

**Acceptance criteria**
- The user's **edits** to a brief are user data. They are included in the data
  export and removed with the account, the same policy as screening answers.
- Generated fields the user never edited are derived public company data, not
  personal data, and are **not** in the export.
- A brief belongs to a user and is removed on account deletion.
