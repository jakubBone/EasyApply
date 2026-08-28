package com.applikon.controller;

import com.applikon.dto.UserExportResponse;
import com.applikon.dto.UserResponse;
import com.applikon.entity.User;
import com.applikon.security.AuthenticatedUser;
import com.applikon.security.JwtService;
import com.applikon.service.UserExportService;
import com.applikon.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@Tag(name = "Auth", description = "Google OAuth2 login, JWT refresh, consent, account management")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final JwtService jwtService;
    private final MessageSource messageSource;
    private final UserExportService userExportService;

    public AuthController(UserService userService, JwtService jwtService,
                          MessageSource messageSource, UserExportService userExportService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.messageSource = messageSource;
        this.userExportService = userExportService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        User user = userService.getById(authenticatedUser.id());
        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    @Operation(summary = "Export all user data as JSON (RODO Art. 20)")
    @GetMapping("/me/export")
    public ResponseEntity<UserExportResponse> exportMyData(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        UserExportResponse export = userExportService.buildExport(principal.id());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"applikon-export.json\"")
                .body(export);
    }

    @Operation(summary = "Refresh access token using a valid refresh token")
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        String refreshToken = extractRefreshTokenFromCookie(request);

        if (refreshToken == null) {
            return ResponseEntity.status(401).body(Map.of("error",
                    messageSource.getMessage("error.token.missing", null, LocaleContextHolder.getLocale())));
        }

        try {
            User user = userService.findByValidRefreshToken(refreshToken);
            String newAccessToken = jwtService.generateAccessToken(user);
            return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
        } catch (Exception e) {
            log.warn("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error",
                    messageSource.getMessage("error.token.invalid", null, LocaleContextHolder.getLocale())));
        }
    }

    @Operation(summary = "Record user consent (required once after first login)")
    @PostMapping("/consent")
    public ResponseEntity<Void> acceptConsent(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        userService.acceptPrivacyPolicy(authenticatedUser.id());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Permanently delete the authenticated user's account and all their data")
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            HttpServletResponse response) {
        userService.deleteAccount(authenticatedUser.id());

        Cookie cookie = new Cookie("refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            HttpServletResponse response) {

        User user = userService.getById(authenticatedUser.id());
        userService.clearRefreshToken(user);

        Cookie cookie = new Cookie("refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.noContent().build();
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refresh_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
