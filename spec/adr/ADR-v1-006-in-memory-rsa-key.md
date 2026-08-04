# ADR-v1-006 — RSA signing key generated in memory at startup

## Context

Access tokens are signed with RS256 ([ADR-v1-001](ADR-v1-001-oauth2-jwt.md)), so the application needs an RSA key pair. Something has to own it, and that something is either configuration or the process itself.

## Decision

`SecurityConfig` generates a 2048-bit key pair at startup with Nimbus `RSAKeyGenerator`. The key lives in memory, is never persisted, and is never configured.

## Alternatives rejected

- **A PEM key from an environment variable** — the correct production answer, and where this goes eventually. Rejected for now: it adds a secret to store, rotate and keep out of git, for a single instance whose access tokens live 15 minutes.
- **A symmetric secret (HS256)** — simpler, but signing and verification become the same key. RS256 keeps the option of letting something else verify a token without giving it the power to mint one.

## Consequences

- Every restart invalidates all outstanding access tokens. Acceptable: they live 15 minutes, and the refresh cookie survives a restart, so the client recovers on its next call to `/api/auth/refresh` without the user noticing.
- **This breaks outright on a second instance.** Two processes generate two key pairs, and a token signed by one fails verification on the other. If the deployment ever stops being a single VPS ([ADR-v1-004](ADR-v1-004-monolith-single-vps.md)), this is the first thing to fix, before anything else.
