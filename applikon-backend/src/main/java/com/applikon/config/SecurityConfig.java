package com.applikon.config;

import com.applikon.security.AdminKeyFilter;
import com.applikon.security.JwtAuthenticationConverter;
import com.applikon.security.OAuth2AuthenticationSuccessHandler;
import com.applikon.security.CustomOAuth2UserService;
import com.applikon.security.ConsentRequiredFilter;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    private final CustomOAuth2UserService customOAuth2UserService;
    private final JwtAuthenticationConverter jwtAuthenticationConverter;

    public SecurityConfig(
            CustomOAuth2UserService customOAuth2UserService,
            JwtAuthenticationConverter jwtAuthenticationConverter) {
        this.customOAuth2UserService = customOAuth2UserService;
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
    }

    // A fresh key pair per boot, held in memory only
    @Bean
    public RSAKey rsaKey() throws Exception {
        return new RSAKeyGenerator(2048)
                .keyID("applikon-key")
                .generate();
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource(RSAKey rsaKey) {
        JWKSet jwkSet = new JWKSet(rsaKey);
        return new ImmutableJWKSet<>(jwkSet);
    }

    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public JwtDecoder jwtDecoder(RSAKey rsaKey) throws Exception {
        return NimbusJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
    }

    // Only the chain is profiled out; TestSecurityConfig supplies a permitAll() one. The key
    // beans above stay active in every profile, because JwtService signs tokens even when
    // nothing is guarding the endpoints.
    @Bean
    @Profile("!test")
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtDecoder jwtDecoder,
            OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler,
            ConsentRequiredFilter consentRequiredFilter,
            AdminKeyFilter adminKeyFilter) throws Exception {
        return http
                // No session/no cookies, only use bearer token
                .csrf(AbstractHttpConfigurer::disable)

                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"))
                        .frameOptions(frame -> frame.deny())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                )

                // Check origin
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // When the access token has expired
                        // The httpOnly refresh cookie is the credential instead
                        .requestMatchers("/api/auth/refresh").permitAll()
                        .requestMatchers("/oauth2/**", "/login/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // AdminKeyFilter below rejects anything without a valid X-Admin-Key header.
                        .requestMatchers("/api/admin/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .anyRequest().authenticated()
                )

                // Register filters for:
                // - GET /oauth2/authorization/google -> 302 redirect Google
                // - callback GET /login/oauth2/code/google -> exchange code to tokens/sub
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService))
                        .successHandler(oAuth2AuthenticationSuccessHandler)
                )

                // Isolate the token from header, verify with RSA public key
                // create AuthenticatedUser -> add to SecurityContextHolder
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(jwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter)))

                // filter runs before because /api/admin/** has X-Admin-Key instead JWT
                .addFilterBefore(adminKeyFilter,
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class)

                // The consent filter reads an authenticated principal from context,
                // so it runs after the JWT filter (if privacyPolicyAccepted == null -> 403 CONSENT_REQUIRED)
                .addFilterAfter(consentRequiredFilter,
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class)

                .build();
    }

    // allowCredentials is on for the refresh cookie, which rules out a wildcard origin, so the
    // allowed list comes from configuration and differs per environment.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-Admin-Key"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
