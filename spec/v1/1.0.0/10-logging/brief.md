# 1.0.0 — Logging

## 1. Problem

The application is being prepared for public deployment on a Hetzner VPS running
Docker Compose. After deployment there is no IDE, no debugger and no interactive
console, so **logs are the only diagnostic tool available**.

The foundation is already solid: `MdcUserFilter` adds `userId` to every log line
automatically, Logback runs a custom pattern, and services log the key business
operations. But three gaps leave the application partly blind in production,
especially around security events and error handling.

**The security boundary is silent.** `AdminKeyFilter` blocks requests to
`/api/admin/**` without a valid `X-Admin-Key` and returns `403` without logging
anything. Brute-force probing of the admin key leaves no trace, and if the filter
itself malfunctions, for example because of a wrong environment variable, the
failure looks exactly like "the filter works and the key is wrong".

**Auth failures are silent.** `POST /api/auth/refresh` wraps token validation in
a try-catch that returns `401` but never logs the exception. An expired token, a
tampered payload, a database error and a code bug are all invisible and
indistinguishable.

**404s are silent.** `handleEntityNotFoundException` returns `404` for every
`EntityNotFoundException` and logs nothing. There is no way to tell an expected
"resource gone" from an unexpected "the frontend sent an ID from a bug".

There is also dead weight: `NoteService` and `JwtService` each declare a `Logger`
field that is never used. That misleads a reader into assuming something is
logged when nothing is.

## 2. Solution

**Log at the "something went wrong" boundary, not at every operation.** Backend
only, no frontend change.

- `AdminKeyFilter` logs `WARN` on every blocked request, with the URI and the
  remote IP.
- `AuthController.refresh()` logs `WARN` in its catch block, with the exception
  message.
- `GlobalExceptionHandler.handleEntityNotFoundException` logs `WARN` with the
  exception message before returning the `ProblemDetail`.
- The two unused `Logger` fields are removed. No placeholder logging.

The existing MDC setup already injects `userId` into every line, so nothing new
is needed there.

## 3. Out of scope

- **Controller-level request logging.** Too noisy, and services already cover
  the mutations.
- **Logging in `ConsentRequiredFilter`.** Consent denials are expected behaviour
  in the OAuth flow, so `debug` at best. Deferred.
- **Structured JSON logs.** The Logback pattern is enough for v1.
- **Log rotation and retention.** Handled by the Docker logging driver and the
  host OS, not by application config.
- **Centralised log aggregation** such as ELK or Grafana Loki. Post-v1.
- **Logging in `JwtAuthenticationConverter` and `TokenHasher`.** Utility classes
  with no observable failure mode worth logging.

## 4. Done when

- A request to `/api/admin/**` with a wrong or missing key produces a `WARN` line
  containing the URI and the remote IP.
- A failed `POST /api/auth/refresh` produces a `WARN` line containing the
  exception message.
- An `EntityNotFoundException` produces a `WARN` line before the `404` response.
- No unused `Logger` fields remain in the codebase.
