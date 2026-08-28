package com.applikon.security;

import org.springframework.security.test.context.support.WithSecurityContext;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// Authenticates a test as a given user without minting a real JWT.
// The default userId has to match the user a @BeforeEach seeds, or user-scoped endpoints will
// look up a principal that owns nothing and the assertions will blame the wrong thing.
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockAuthenticatedUserSecurityContextFactory.class)
public @interface WithMockAuthenticatedUser {
    String userId() default "11111111-1111-1111-1111-111111111111";
    String email()  default "test@example.com";
    String name()   default "Test User";
}
