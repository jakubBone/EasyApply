package com.applikon.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

// Opens every endpoint under the "test" profile, so controller tests can assert on behaviour
// instead of on the 401 they would all get without a signed token. Ordered ahead of the real
// chain, which Spring then never reaches, because the first match wins. Identity still comes
// from @WithMockAuthenticatedUser, so tests stay user-scoped; only the gate is gone.
// The cost of the shortcut: no test exercises the production access rules.
@Configuration
@Profile("test")
public class TestSecurityConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }
}
