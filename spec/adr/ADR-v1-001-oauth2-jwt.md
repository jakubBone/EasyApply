# ADR-v1-001 — OAuth2 + JWT authentication

## Context

The MVP needed authentication. Options: session-based (traditional) or stateless (OAuth2 + JWT).

## Decision

**Google OAuth2 for login, JWT for API calls.**

Backend exchanges the OAuth code, upserts the user, and issues:
- Access token (JWT, RS256, 15 minutes) for API calls
- Refresh token (HTTP-only cookie) to get a new access token

Every API call is scoped by `user_id`, so users cannot access each other's data. On first login, the user must accept the privacy policy before any data is written.

## Consequences

- **Stateless.** No session table to sync across instances; easier to scale.
- **Google manages credentials.** User never types a password into our system.
- **Refresh token in a cookie.** Secure, but the cookie must be same-site and HTTPS-only.
- The access token in `Authorization: Bearer` header, so CSRF is not a concern.
