package com.applikon.security;

import com.applikon.entity.User;
import com.applikon.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

// The hand-off from Google's redirect flow to the app's own tokens. OAuth2 ends in a browser
// redirect, so there is no response body to put a token in; it travels in the URL fragment,
// which browsers never send to a server, and the callback page strips it from the address bar.
@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2AuthenticationSuccessHandler.class);

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.jwt.refresh-token-expiry-days:7}")
    private int refreshTokenExpiryDays;

    private final UserService userService;
    private final JwtService jwtService;

    public OAuth2AuthenticationSuccessHandler(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String googleId = oAuth2User.getAttribute("sub");
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        User user = userService.findOrCreateUser(googleId, email, name);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken();

        LocalDateTime expiry = LocalDateTime.now().plusDays(refreshTokenExpiryDays);
        userService.saveRefreshToken(user, refreshToken, expiry);

        // The long-lived half of the pair never touches JavaScript. httpOnly keeps XSS from
        // reading it, the narrow path keeps it off every other request, and SameSite=Strict
        // means a foreign site cannot trigger a refresh on the user's behalf.
        Cookie refreshCookie = new Cookie("refresh_token", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setPath("/api/auth");
        refreshCookie.setAttribute("SameSite", "Strict");
        refreshCookie.setMaxAge(refreshTokenExpiryDays * 24 * 60 * 60);
        response.addCookie(refreshCookie);

        log.info("User {} logged in via Google", user.getId());

        String redirectUrl = frontendUrl + "/auth/callback#token=" + accessToken;
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
