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

// Stamps the caller's id onto every log line of a request (Logback pattern %X{userId}), so a
// report can be traced without threading a userId through every method signature. Depends on
// running after the security chain, which is where Boot registers @Component filters anyway.
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
            // The clear has to happen even on an exception. Tomcat reuses request threads, so
            // a leaked key would label the next user's logs with the previous user's id.
            MDC.remove(MDC_KEY);
        }
    }
}
