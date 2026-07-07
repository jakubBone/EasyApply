# Applikon 2.1.0 — User Stories

> Stories, edge cases, and acceptance criteria for the company brief.
> Source of the feature: [`brief.md`](brief.md). Decisions taken with the user
> are recorded inline as acceptance criteria.
>
> **Pivot (2026-07-06):** originally planned as automatic-on-add; changed to
> **on-demand (button)** during planning to spend free-tier quota only on briefs
> the user actually asks for.

---

## 1. On-demand generation

**US-1.1** — As a candidate, I want to generate a company brief with one click on
an application, so the research is ready when I want it — right after applying or
minutes before a call.

**Acceptance criteria**
- Generated **only on the user's click** — a **"Generate brief"** button in the
  **"About the company" section header, next to the existing "Add/Edit"**
  action; nothing fires automatically. The button is **visually distinctive as
  the AI action** (exact look in [`implementation-plan.md`](implementation-plan.md)).
- The button is available on **every application without a brief** — including
  applications created before 2.1.0.
- Generation runs **in the background**; the rest of the app is never slowed
  down or blocked by it.
- **Input sent to the AI provider: company name + job-ad link** (`Application.link`,
  exists since v1) **when present — nothing else.** No job description, no notes,
  no salary, no user data.
- The brief has **4 structured fields**: industry / what the company does ·
  product & customers (B2B/B2C) · tech stack · size / stage.
- A field without sufficient public data **explicitly says "not enough public
  info"** — it is shown, not hidden, and never filled with a guess.
- **Generated once per company per user:** the raw brief is cached **per (user,
  company)**. Clicking the button on a second application to the same company
  **reuses the cached brief** (no new AI call); different users each generate
  their own.

**Edge cases**
- Same company spelled differently ("Comarch" vs "Comarch S.A.") → different
  cache entries; accepted (no fuzzy matching).
- A generated brief is **final** (short of failed-retry): it never regenerates —
  even if the user later changes the company name or adds the job-ad link.

---

## 2. Status and failures

**US-2.1** — As a candidate, I want to see honestly whether the brief is ready,
still generating, or failed, so the cheat sheet never shows me stale emptiness.

**Acceptance criteria**
- Before generation: the section shows the **"Generate brief"** button (no empty
  brief fields).
- While generating: a **"generating…" state with a spinner** in the section.
- On failure — including provider down or free-tier quota exhausted: an **error
  message with a "try again" button**; the copy may suggest trying again later.
- **Retry is manual only** — no automatic retry, no queue, no scheduler.
- **No regeneration of a ready brief** — regeneration burns free-tier quota;
  "try again" exists **only** for the failed state.

---

## 3. Where the brief lives and editing

**US-3.1** — As a candidate, I want the brief inside the application's **"About
the company"** section (next to "What do you know about us?"), edited only there,
so all company prep stays on one screen.

**Acceptance criteria**
- On successful generation (or cache reuse), the brief's 4 fields **appear in
  the application's "About the company" section as editable entries** — the
  same shape and edit modal as the existing per-application questions.
  (Implementation: displayed from the cache + per-application edit overrides —
  nothing is physically copied; see [`implementation-plan.md`](implementation-plan.md) Step 1.)
- The user's edits are **per application** (stored as overrides); the cached
  raw brief is never modified by them.
- The layout must stay **intuitive and very readable** — the section is the
  recruiter-call fast path; the exact visual design lands in [`implementation-plan.md`](implementation-plan.md).

**Edge cases**
- Deleting an application removes its copied entries; the **(user, company)
  cache survives** for future applications and is removed only with the account.

---

## 4. Language

**US-4.1** — As a candidate using the app in Polish or English, I want the brief
in my app language — and if I switch the language, the brief follows.

**Acceptance criteria**
- **One AI call generates both PL and EN** versions of every field (a single
  request — free-tier limits count requests); both are stored in the cache.
- The per-application copy and the UI show the version matching the **current app
  language**, switching instantly with it.
- **User edits are the user's own text** — never machine-translated. An edited
  field shows the **same user text in both languages** (the edit wins over the
  generated versions): during a call the user sees one truth — their own — and
  per-language overrides would add mechanics without value.

---

## 5. Data lifecycle (GDPR)

**Acceptance criteria**
- The **per-application edits are user data**: included in the data export and
  removed with the application / account (same policy as screening answers).
- The **(user, company) cache is not in the export** (derived public company
  data, not personal data), but being user-scoped it **is removed on account
  deletion**.
