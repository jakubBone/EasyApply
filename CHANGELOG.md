# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Public landing page for unauthenticated users with rotating job portal animation, feature cards, and Google login CTA (phase 15)

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
