package com.applikon.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.UUID;

// Turns a verified token into the principal the controllers actually want. Without this,
// @AuthenticationPrincipal hands them a raw Jwt and every controller has to dig claims out
// of it by hand.
@Component
public class JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");

        AuthenticatedUser authenticatedUser = new AuthenticatedUser(userId, email, name);

        return new AuthenticatedUserToken(jwt, authenticatedUser);
    }

    // JwtAuthenticationToken.getPrincipal() is hardcoded to return the Jwt, and the class
    // offers no hook to change that. Subclassing to override the one method is the smallest
    // way to swap in AuthenticatedUser while keeping the rest of the resource-server plumbing.
    static class AuthenticatedUserToken extends JwtAuthenticationToken {

        private final AuthenticatedUser authenticatedUser;

        AuthenticatedUserToken(Jwt jwt, AuthenticatedUser authenticatedUser) {
            super(jwt, Collections.emptyList());
            this.authenticatedUser = authenticatedUser;
        }

        @Override
        public Object getPrincipal() {
            return authenticatedUser;
        }
    }
}
