package com.applikon.security;

import java.util.UUID;

// The caller's identity for one request, built from JWT claims by JwtAuthenticationConverter
// and injected into controllers with @AuthenticationPrincipal. Everything here comes from the
// token, so it is only as fresh as the last login; the database row is the source of truth.
public record AuthenticatedUser(UUID id, String email, String name) {}
