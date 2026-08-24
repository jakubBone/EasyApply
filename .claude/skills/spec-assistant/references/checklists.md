# PAF validation checklists

## PRD checklist — is it "closed"

- [ ] Does the **product description** (1 sentence) clearly say what it is and who it's for?
- [ ] Does **out of scope** have at least 5 items?
- [ ] Does every **user flow** describe error variants?
- [ ] Does every **user story** have acceptance criteria?
- [ ] Is there a **Definition of Done**?
- [ ] Do the **NFRs** cover platform, performance and security?
- [ ] Are all **undecided decisions** in the "Open questions" section?

If the answer to any of these is "no" — the model will guess.

## SPEC.md checklist — is it "closed"

- [ ] Do **Commands** have exact commands + versions?
- [ ] Does **Testing** say when, how and where to write tests?
- [ ] Does **Structure** have a directory map + import rules?
- [ ] Does **Code Style** have at least 5-10 concrete rules?
- [ ] Does **Git Workflow** describe commits, branches and PRs?
- [ ] Do **Boundaries** have at least 5/5/5 across the three levels?

If the answer to any of these is "no" — the model will invent its own answer.

## User Stories checklist — is coverage sufficient

- [ ] Is the **happy path** covered for the main features?
- [ ] Are there stories for **edge cases** (concurrent access, limits, odd data)?
- [ ] Are there stories for **errors** (what happens when something fails)?
- [ ] Are there stories for **security/privacy** (GDPR, data deletion)?
- [ ] Are **different roles** covered (admin, user, guest)?
- [ ] Did the user **write the answers themselves** to the questions (not the model)?

## Task checklist — is it well broken down

- [ ] Is the task **small** (one prompt, one goal)?
- [ ] Is it **testable** (it's clear how to tell it succeeded)?
- [ ] Is it **independent** (doesn't depend on unfinished tasks)?
- [ ] Is it **unambiguous** (the model doesn't have to guess)?
