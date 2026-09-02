package com.applikon.observability;

import com.applikon.security.AuthenticatedUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Mapped Diagnostic Context stamps the caller's id onto every log line of a request
// (Logback pattern %X{userId}), so a report can be traced without threading a userId
// through every method signature. Run after the main security chain
@Component
public class MdcUserFilter extends OncePerRequestFilter {

    private static final String MDC_KEY = "userId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
                MDC.put(MDC_KEY, user.id().toString());
            }
            filterChain.doFilter(request, response);
        } finally {
            // The clear has to happen after all request, or even on an exception
            MDC.remove(MDC_KEY);
        }
    }
}
