package com.applikon.security;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

import java.util.Collections;
import java.util.UUID;

// UsernamePasswordAuthenticationToken is a deliberate stand-in for the JwtAuthenticationToken
// production uses. @AuthenticationPrincipal reads the principal off any Authentication, so the
// controllers cannot tell the difference, and the tests avoid signing a token to prove routing.
// The trade-off is that no controller test exercises token validation at all.
public class WithMockAuthenticatedUserSecurityContextFactory
        implements WithSecurityContextFactory<WithMockAuthenticatedUser> {

    @Override
    public SecurityContext createSecurityContext(WithMockAuthenticatedUser annotation) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();

        AuthenticatedUser principal = new AuthenticatedUser(
                UUID.fromString(annotation.userId()),
                annotation.email(),
                annotation.name()
        );

        Authentication auth = new UsernamePasswordAuthenticationToken(
                principal, null, Collections.emptyList());

        context.setAuthentication(auth);
        return context;
    }
}
