package com.applikon.security;

import com.applikon.entity.User;
import com.applikon.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Guard filter: Ensures user has accepted the privacy policy.
 *
 * Runs after JWT authentication — user is already authenticated.
 * Checks privacyPolicyAcceptedAt field on every request.
 *
 * Whitelisted endpoints (no check):
 * - GET /api/auth/me
 * - POST /api/auth/consent
 * - POST /api/auth/logout
 * - POST /api/auth/refresh
 * - DELETE /api/auth/me
 * - /actuator/**
 * - /oauth2/**, /login/**
 *
 * For all other requests: if user.privacyPolicyAcceptedAt == null → 403 CONSENT_REQUIRED
 */
@Component
public class ConsentRequiredFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ConsentRequiredFilter(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // Skip for whitelisted paths
        if (isWhitelisted(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // If not authenticated, skip (will be caught by @AuthenticationPrincipal later)
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof AuthenticatedUser)) {
            filterChain.doFilter(request, response);
            return;
        }

        AuthenticatedUser authenticatedUser = (AuthenticatedUser) authentication.getPrincipal();
        User user = userRepository.findById(authenticatedUser.id()).orElse(null);

        if (user == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // Check consent
        if (user.getPrivacyPolicyAcceptedAt() == null) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write(objectMapper.writeValueAsString(
                    Map.of("error", "CONSENT_REQUIRED")
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isWhitelisted(HttpServletRequest request) {
        String path = request.getRequestURI();

        return path.startsWith("/api/auth/") && (
                path.equals("/api/auth/me") ||
                path.equals("/api/auth/consent") ||
                path.equals("/api/auth/logout") ||
                path.equals("/api/auth/refresh")
        ) ||
        path.startsWith("/oauth2/") ||
        path.startsWith("/login/") ||
        path.startsWith("/actuator/");
    }
}
