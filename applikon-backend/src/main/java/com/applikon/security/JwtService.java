package com.applikon.security;

import com.applikon.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

// Issues the two halves of a session. RS256 rather than HS256 so the verifying key can be
// published without letting anyone mint tokens, which is what makes splitting this into a
// separate service worthwhile later. Verification itself is Spring's, wired in SecurityConfig.
@Service
public class JwtService {

    @Value("${app.jwt.access-token-expiry-minutes:15}")
    private long accessTokenExpiryMinutes;

    private final JwtEncoder jwtEncoder;

    public JwtService(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    // Email and name ride along so the UI can render a header without a round trip. They are a
    // snapshot: a profile change only shows up after the next token, which the 15-minute expiry
    // keeps short. Nothing here is a permission, so a stale claim cannot widen access.
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

    // Opaque on purpose. A signed refresh token would stay valid until it expired; this one is
    // only as good as the hash stored on the user row, so logout and account deletion revoke it
    // immediately.
    public String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }
}
