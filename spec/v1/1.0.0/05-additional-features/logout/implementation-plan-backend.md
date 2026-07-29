# Logout Implementation Plan — Applikon Backend

## Status

### Stage 0 — State Verification (no implementation required)

- [x] `controller/AuthController.java` — endpoint `POST /api/auth/logout` exists
- [x] Endpoint: removes `refreshToken` from DB via `userService.clearRefreshToken(user)`
- [x] Endpoint: sets cookie `refresh_token` with `maxAge=0` (clears client-side)
- [x] Endpoint: requires active JWT (`@AuthenticationPrincipal AuthenticatedUser`)
- [x] `mvn test` green

> Backend is complete. No changes to production code are required.

---

## Endpoint Architecture

```
POST /api/auth/logout
Authorization: Bearer <access_token>
→ 204 No Content

Side effects:
  1. User.refreshToken = null  (in DB)
  2. Cookie refresh_token      (deleted via maxAge=0)
```

**Why is JWT not invalidated?**
Access token is stateless — cannot be invalidated without a token blacklist.
Logout removes refresh token, so user cannot renew session after access token expires.
Frontend deletes access token from localStorage immediately after logout.

---

## Out of Scope

- Blacklisting access tokens — unnecessary for this application
- Logout from all devices — separate feature

---

*Last update: 2026-04-07*
