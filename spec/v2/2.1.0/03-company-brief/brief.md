# Applikon 2.1.0 — Company Brief

# 1. Problem

The cheat sheet (2.0.0) gave every application an **"About the company"** section —
but the candidate still fills it by hand. In practice that means googling the
company after adding the application, and most users never do it: the recruiter
calls, the section is empty, and *"what do you know about us?"* lands on an
unprepared candidate anyway.

The research itself is mechanical: what the company does, who its customers are,
what stack it uses, how big it is. This is exactly the kind of first-pass work an
LLM with search grounding does well — a **starting point** the candidate verifies
and builds on, not a replacement for their own answer.

2.1.0 adds exactly one feature: a **company brief generated on demand** per
application. Nothing else changes.

---

# 2. User

Same as v2: Polish IT candidates (junior/mid) applying to 10–20 jobs per month
through job boards. Research that used to be a browsing session becomes one click —
done right after applying or minutes before the call, whenever the candidate wants
it. On demand also means the free-tier AI quota is spent only on briefs the user
actually asked for.

---

# 3. Feature — company brief on demand

**Moment:** the user decides — typically right after applying, or before a
scheduled call.

- Generated **on demand, with one button click** — never automatically.
- **Structured, 4 fields** (not freeform prose):
  1. industry / what the company does,
  2. product & customers (B2B/B2C),
  3. tech stack,
  4. size / stage.
- Shown in the application's **cheat sheet**.

---

# 4. Out of scope for 2.1.0

Deliberately excluded — this release is one feature, validated end to end:

- **Any other AI feature.** The company brief is the whole AI surface of this
  release.
- **No automatic generation.** Nothing fires without the user's click.
- **No AI-driven actions.** The model output is displayed, never executed.
- **No new module structure, event system, or infrastructure.** One background
  call inside the existing monolith.
- **No paid tier.** Free tier only.

---

# 5. Success Criteria

2.1.0 is successful when:

- ✅ One click on an application produces a company brief with the 4 structured
  fields, visible in that application's cheat sheet.
- ✅ Nothing else in the app is slowed down, blocked, or broken by generation.
