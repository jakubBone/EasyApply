# 2.2.0 — Question Kind

## 1. Problem

The cheat sheet holds every question the candidate has collected for an
application, in one flat list. But those questions are used at two completely
different moments.

**On a screening call**, a recruiter asks about notice period, salary
expectations, English level, why you are leaving. The candidate needs these on
screen within seconds, mid-call.

**In a technical interview**, someone asks how transactions propagate in Spring,
or what the difference between `@Component` and `@Bean` is. This is prepared the
evening before, not read out during a call.

Today the two sit interleaved. During a screening call the candidate scrolls past
`ConcurrentHashMap` to find "notice period", at exactly the moment when scrolling
costs the most. And when preparing for a technical round, the screening answers
are noise.

The information that separates them exists in the candidate's head and nowhere in
the data. This release writes it down.

## 2. Solution

Each question gains one attribute: **`SCREENING` or `TECHNICAL`**.

- It is set when the question is added or edited, and defaults to `SCREENING` —
  the overwhelmingly common case, and what every existing question already is.
- The cheat sheet **splits by kind**, so the candidate opens the group that
  matches the moment instead of scanning one list.
- Nothing else about questions changes: same table, same two scopes (the user's
  global "My answers" and the per-application set), same editing, same saving.

That is the whole release.

## 3. Out of scope

- **A third kind.** Two is what the two moments justify. `BEHAVIOURAL`,
  `SYSTEM DESIGN` and friends are a taxonomy nobody asked for, and adding one
  later is a single enum value.
- **Automatic classification.** The user sets the kind. Guessing it, with or
  without a model, would be a new AI surface, a new failure mode, and a new thing
  to correct.
- **A cross-application question view.** Browsing every question ever asked
  across all applications is a genuinely different feature that only pays off
  with a model reading it. It belongs to the v3 era.
- **Any change to how answers are saved.** The existing replace-all autosave
  stays exactly as it is.
- **Migrating existing data.** Existing questions become `SCREENING` through the
  column default. Nothing is rewritten and nothing is re-classified.

## 4. Done when

- A question can be marked as screening or technical, in both scopes, when
  created and when edited.
- The cheat sheet shows the two kinds separately, so the candidate reaches the
  right group without reading the other.
- Every question that existed before this release still works, still shows, and
  reads as screening.
