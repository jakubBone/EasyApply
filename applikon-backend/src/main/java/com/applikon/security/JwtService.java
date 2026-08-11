package com.applikon.security;

import com.applikon.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Service responsible for generating and validating JWT tokens.
 *
 * Uses RS256 (asymmetric):
 * - private key (RSAKey) → signs tokens (only the backend holds this)
 * - public key → verifies tokens (can be shared with clients if needed)
 *
 * JwtEncoder = Spring encoder (produces tokens)
 * JwtDecoder = Spring decoder (verifies tokens) — configured in SecurityConfig
 */
@Service
public class JwtService {

    @Value("${app.jwt.access-token-expiry-minutes:15}")
    private long accessTokenExpiryMinutes;

    private final JwtEncoder jwtEncoder;

    public JwtService(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    /**
     * Generates an access token for the authenticated user.
     *
     * Token payload (claims):
     * - sub   = user UUID (subject — who this is)
     * - email, name = profile data
     * - iss   = issuer (who issued the token)
     * - iat   = issued at (when it was issued)
     * - exp   = expiry (when it expires)
     */
    public String generateAccessToken(User user) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("applikon")
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenExpiryMinutes, ChronoUnit.MINUTES))
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    /**
     * Generates a refresh token — a random UUID.
     * The token is opaque and carries no data.
     * Stored in an httpOnly cookie on the client side.
     */
    public String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }
}
