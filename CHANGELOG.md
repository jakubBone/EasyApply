# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-07-22

### Added
- Company brief: one click generates four researched fields about the company (industry, product and customers, tech stack, size and stage) in the "About the company" section, in Polish and English, ready before a recruiter call
- A brief is generated once per company and reused by every application to it; any field can be corrected by hand and the correction shows on every application to that company
- Fields with no verifiable public information are marked as such instead of being guessed
- Brief fields edited by the user are included in the JSON data export (RODO Art. 20)

### Changed
- "What do you know about us?" is hidden while unanswered once a brief is ready; an answered one always stays visible
- Optional `GROQ_API_KEY` for self-hosted instances - the app starts without it, only brief generation fails

## [2.0.0] - 2026-07-06

### Added
- Screening cheat sheet: a "General" answers template (fixed + custom questions) plus per-application "About the company" questions, composed with the proposed salary on one screen before a recruiter call
- Board cleanup - flags applications stuck in "Sent" for 60+ days with no response, with one-click archive
- Salary field for fixed compensation on applications

### Changed
- Redesigned landing page sections, copy, and preview image
- App now follows standard SemVer from this release onward, independent of the internal spec version numbering (see `spec/PROCESS.md`)

### Fixed
- Kanban drag & drop target detection, with optimistic stage updates
- Status name mismatch in the stage-update request
- Dashboard view and details now stay in sync with the URL so the browser back button works
- Privacy policy effective date hardcoded instead of using the current date

## [1.1.0] - 2026-05-29

### Added
- Public landing page for unauthenticated users with rotating job portal animation, feature cards, and Google login CTA (15-landing-page)

### Fixed
- Force full page reload on logout to prevent stale JS bundle after deploy
- Disable `index.html` caching so browsers always fetch the latest version on deploy

### Changed
- Simplified landing page content and improved mobile layout: reduced feature cards on mobile, merged recruiter contacts with notes card, shortened section descriptions, increased section spacing

## [1.0.0] - 2026-05-28

### Added
- Job application tracker for Polish IT job seekers
- Google OAuth2 login
- Kanban board, list view, and CV link management
- Notes per application with categories
- Application statistics with badges
- GDPR compliance — consent, personal data export, account deletion
- Service notices system for admin announcements
- Polish / English language switcher
- Mobile-responsive UI with FAB and bottom sheets
- GitHub Actions CI pipeline
