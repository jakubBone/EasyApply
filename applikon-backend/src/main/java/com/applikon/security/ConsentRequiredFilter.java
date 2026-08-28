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

// Blocks every request from a user who has not accepted the privacy policy, answering 403
// CONSENT_REQUIRED so the frontend can show the consent gate. Enforced here rather than per
// controller: consent is a precondition for touching any data at all, and one forgotten
// annotation on a new endpoint would silently be a GDPR hole. The whitelist below is what a
// not-yet-consenting user still needs: read own profile, consent, log out, refresh, delete.
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

        if (isWhitelisted(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Rejecting anonymous callers is not this filter's job. Either the chain's own rules
        // already did it, or the endpoint is public on purpose.
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
