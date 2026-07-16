package com.applikon.controller;

import com.applikon.entity.*;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CVRepository;
import com.applikon.repository.NoteRepository;
import com.applikon.repository.UserRepository;
import com.applikon.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.TestSecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private NoteRepository noteRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        noteRepository.deleteAll();
        applicationRepository.deleteAll();
        cvRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User("test@example.com", "Test User", "google-test-auth");
        testUser.acceptPrivacyPolicy();
        testUser = userRepository.save(testUser);

        AuthenticatedUser principal = new AuthenticatedUser(
                testUser.getId(), testUser.getEmail(), testUser.getName());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, Collections.emptyList()));
        TestSecurityContextHolder.setContext(ctx);
    }

    @AfterEach
    void tearDown() {
        TestSecurityContextHolder.clearContext();
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/auth/consent - accepts privacy policy and sets timestamp")
    void acceptConsent_SetsPrivacyPolicyTimestamp() throws Exception {
        // Arrange
        User newUser = new User("new@example.com", "New User", "google-new");
        // Do not accept policy
        newUser = userRepository.save(newUser);

        AuthenticatedUser principal = new AuthenticatedUser(
                newUser.getId(), newUser.getEmail(), newUser.getName());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, Collections.emptyList()));
        TestSecurityContextHolder.setContext(ctx);

        // Act
        mockMvc.perform(post("/api/auth/consent"))
                .andExpect(status().isNoContent());

        // Assert
        User updated = userRepository.findById(newUser.getId()).orElseThrow();
        assertNotNull(updated.getPrivacyPolicyAcceptedAt(), "Should accept policy");
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/auth/consent - idempotent: calling twice doesn't overwrite timestamp")
    void acceptConsent_Idempotent() throws Exception {
        // First call
        mockMvc.perform(post("/api/auth/consent"))
                .andExpect(status().isNoContent());

        User firstCall = userRepository.findById(testUser.getId()).orElseThrow();
        LocalDateTime firstTimestamp = firstCall.getPrivacyPolicyAcceptedAt();

        // Sleep briefly
        Thread.sleep(100);

        // Second call
        mockMvc.perform(post("/api/auth/consent"))
                .andExpect(status().isNoContent());

        User secondCall = userRepository.findById(testUser.getId()).orElseThrow();
        LocalDateTime secondTimestamp = secondCall.getPrivacyPolicyAcceptedAt();

        assertEquals(firstTimestamp, secondTimestamp, "Should not overwrite timestamp");
    }

    @Test
    @Order(3)
    @DisplayName("DELETE /api/auth/me - deletes user account and all related data")
    void deleteAccount_RemovesUserAndAllRelatedData() throws Exception {
        // Arrange: Create application, CV, note for testUser
        Application app = new Application();
        app.setUser(testUser);
        app.setCompany("Test Corp");
        app.setPosition("Dev");
        app.setStatus(ApplicationStatus.SENT);
        app = applicationRepository.save(app);

        CV cv = new CV();
        cv.setUser(testUser);
        cv.setType(CVType.LINK);
        cv.setOriginalFileName("test.pdf");
        cv.setExternalUrl("https://example.com/cv.pdf");
        cvRepository.save(cv);

        Note note = new Note();
        note.setApplication(app);
        note.setContent("Test note");
        note.setCategory(NoteCategory.QUESTIONS);
        noteRepository.save(note);

        UUID userId = testUser.getId();

        // Act
        mockMvc.perform(delete("/api/auth/me"))
                .andExpect(status().isNoContent());

        // Assert
        assertFalse(userRepository.existsById(userId), "User should be deleted");
        assertEquals(0, applicationRepository.findAll().size(), "Applications should be deleted");
        assertEquals(0, cvRepository.findAll().size(), "CVs should be deleted");
        assertEquals(0, noteRepository.findAll().size(), "Notes should be deleted");
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/auth/me - returns privacyPolicyAcceptedAt field")
    void me_ReturnsPrivacyPolicyAcceptedAt() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testUser.getId().toString()))
                .andExpect(jsonPath("$.email").value(testUser.getEmail()))
                .andExpect(jsonPath("$.privacyPolicyAcceptedAt").exists());
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/auth/me/export - returns export with profile, applications and notes")
    void exportMyData_ReturnsFullExport() throws Exception {
        Application app = new Application();
        app.setUser(testUser);
        app.setCompany("Export Corp");
        app.setPosition("Developer");
        app.setStatus(ApplicationStatus.SENT);
        app = applicationRepository.save(app);

        Note note = new Note();
        note.setApplication(app);
        note.setContent("Export note");
        note.setCategory(NoteCategory.QUESTIONS);
        noteRepository.save(note);

        mockMvc.perform(get("/api/auth/me/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andExpect(jsonPath("$.profile.email").value(testUser.getEmail()))
                .andExpect(jsonPath("$.applications").isArray())
                .andExpect(jsonPath("$.applications.length()").value(1))
                .andExpect(jsonPath("$.applications[0].notes.length()").value(1));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/auth/me/export - user without applications returns empty list")
    void exportMyData_NoApplications_ReturnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/auth/me/export"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applications").isArray())
                .andExpect(jsonPath("$.applications.length()").value(0));
    }

    // Note: 401 for missing JWT is enforced by production SecurityConfig (anyRequest().authenticated()).
    // TestSecurityConfig uses permitAll() so JWT enforcement cannot be tested at the controller layer.
}
