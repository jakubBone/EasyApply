# Logout Implementation Plan — Applikon Backend

## Work Process (applicable to each stage)

1. **Implementation** — Claude makes code changes
2. **Automatic verification** — `mvn test` must be green
3. **Manual verification** — user manually tests the endpoint (optional)
4. **Update plans** — Claude updates checkboxes in this file
5. **Commit suggestion** — Claude proposes commit message (format: `type(backend): description`)
6. **Commit** — user runs `git add` + `git commit`
7. **Continue question** — Claude asks if we proceed to next stage

---

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
