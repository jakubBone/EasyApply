# Applikon 2.2.0 — Question Kind

# 1. Problem

The cheat sheet holds every question the candidate has collected for an
application — in **one flat list**. But those questions are used at two completely
different moments:

- **Screening call.** A recruiter asks about notice period, salary expectations,
  English level, why you are leaving. The candidate needs these on screen within
  seconds, mid-call.
- **Technical interview.** Someone asks how transactions propagate in Spring, or
  what the difference between `@Component` and `@Bean` is. This is prepared the
  evening before, not read out during a call.

Today they sit interleaved. During a screening call the candidate scrolls past
`ConcurrentHashMap` to find *"notice period"* — at exactly the moment where
scrolling is most expensive. And when preparing for a technical round, the
screening answers are noise.

The information that separates them exists in the candidate's head and nowhere in
the data. 2.2.0 writes it down.

---

# 2. User

Same as v2: Polish IT candidates (junior/mid) applying to 10–20 jobs per month.
The one who feels this is the candidate far enough along that applications reach a
**second round** — the point where a cheat sheet stops being a short list and
becomes something you have to search.

---

# 3. Feature — every question carries a kind

Each question gains one attribute: **`SCREENING` or `TECHNICAL`**.

- Set when the question is added or edited, defaulting to `SCREENING` — the
  overwhelmingly common case, and what every existing question already is.
- The cheat sheet **splits by kind**, so the candidate opens the group that
  matches the moment instead of scanning one list.
- Nothing else about questions changes: same table, same scopes (the user's global
  "My answers" and the per-application set), same editing, same saving.

That is the whole release.

---

# 4. Out of scope for 2.2.0

- **No third kind.** Two is what the moments justify. `BEHAVIOURAL`, `SYSTEM
  DESIGN` and friends are a taxonomy nobody asked for; adding them later is one
  enum value.
- **No automatic classification.** The user sets the kind. Guessing it — with or
  without a model — would be a new AI surface, a new failure mode, and a new
  thing to correct.
- **No cross-application question view.** Browsing every question ever asked,
  across all applications, is a genuinely different feature that only pays off
  with a model reading it. It belongs to the v3 era.
- **No change to how answers are saved.** The existing replace-all autosave stays
  exactly as it is.
- **No migration of existing data.** Existing questions become `SCREENING` by
  column default. Nothing is rewritten, nothing is re-classified.

---

# 5. Success Criteria

2.2.0 is successful when:

- ✅ A question can be marked as screening or technical, in both scopes, when
  created and when edited.
- ✅ The cheat sheet shows the two kinds separately, so the candidate reaches the
  right group without scanning the other.
- ✅ Every question that existed before 2.2.0 still works, still shows, and is
  marked as screening.
