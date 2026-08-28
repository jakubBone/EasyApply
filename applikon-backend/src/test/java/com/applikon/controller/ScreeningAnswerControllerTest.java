package com.applikon.controller;

import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CVRepository;
import com.applikon.repository.NoteRepository;
import com.applikon.dto.ScreeningAnswerRequest;
import com.applikon.repository.ScreeningAnswerRepository;
import com.applikon.repository.UserRepository;
import com.applikon.security.AuthenticatedUser;
import com.applikon.service.ScreeningAnswerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.TestSecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("ScreeningAnswerController tests")
class ScreeningAnswerControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ScreeningAnswerRepository screeningAnswerRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private NoteRepository noteRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ScreeningAnswerService screeningAnswerService;

    private User testUser;

    @BeforeEach
    void setUp() {
        screeningAnswerRepository.deleteAll();
        noteRepository.deleteAll();
        applicationRepository.deleteAll();
        cvRepository.deleteAll();
        userRepository.deleteAll();

        testUser = createUser("test@example.com", "google-screening-a");
        authenticateAs(testUser);
    }

    @AfterEach
    void tearDown() {
        TestSecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("PUT then GET returns the saved set in order")
    void saveThenFetch_returnsSetInOrder() throws Exception {
        saveAnswers(List.of(
                answer("about-me", null, "I am a junior dev", false),
                answer("expected-salary", null, "8000 PLN", false),
                answer(null, "Favourite stack?", "Spring Boot", true)
        )).andExpect(status().isOk());

        mockMvc.perform(get("/api/screening-answers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].questionKey").value("about-me"))
                .andExpect(jsonPath("$[0].sortOrder").value(0))
                .andExpect(jsonPath("$[1].questionKey").value("expected-salary"))
                .andExpect(jsonPath("$[2].label").value("Favourite stack?"))
                .andExpect(jsonPath("$[2].custom").value(true))
                .andExpect(jsonPath("$[2].sortOrder").value(2));
    }

    @Test
    @DisplayName("PUT replaces the previous set (replace-all upsert)")
    void save_replacesPreviousSet() throws Exception {
        saveAnswers(List.of(answer("about-me", null, "Old", false)));
        saveAnswers(List.of(answer("expected-salary", null, "New", false)));

        mockMvc.perform(get("/api/screening-answers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].questionKey").value("expected-salary"))
                .andExpect(jsonPath("$[0].answer").value("New"));
    }

    @Test
    @DisplayName("Answers are isolated per user")
    void answers_areIsolatedPerUser() throws Exception {
        // Seed user A's answer directly (mirrors DataIsolationTest): user switching is done
        // before the first request, so the controller resolves the principal cleanly.
        screeningAnswerService.save(testUser.getId(),
                List.of(new ScreeningAnswerRequest("about-me", null, "User A answer", false)));

        User userB = createUser("b@example.com", "google-screening-b");
        authenticateAs(userB);

        // User B never sees user A's answers.
        mockMvc.perform(get("/api/screening-answers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // User A's set is still intact (the GET endpoint returning a user's own set is
        // covered by saveThenFetch_returnsSetInOrder).
        assertEquals(1, screeningAnswerRepository.findByUserIdOrderBySortOrder(testUser.getId()).size());
    }

    @Test
    @DisplayName("Answer longer than 1000 characters is rejected with 400")
    void save_answerOver1000Chars_returnsBadRequest() throws Exception {
        String tooLong = "x".repeat(1001);

        saveAnswers(List.of(answer("about-me", null, tooLong, false)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['answers[0].answer']").value(containsString("1000")));
    }

    @Test
    @DisplayName("Custom question with a blank label is not persisted")
    void save_customQuestionWithBlankLabel_notPersisted() throws Exception {
        saveAnswers(List.of(
                answer("about-me", null, "Kept", false),
                answer(null, "   ", "Dropped", true)
        )).andExpect(status().isOk());

        mockMvc.perform(get("/api/screening-answers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].questionKey").value("about-me"));
    }

    @Test
    @DisplayName("Data export includes screening answers (RODO)")
    void export_includesScreeningAnswers() throws Exception {
        saveAnswers(List.of(answer("about-me", null, "Exported answer", false)));

        mockMvc.perform(get("/api/auth/me/export"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.screeningAnswers", hasSize(1)))
                .andExpect(jsonPath("$.screeningAnswers[0].questionKey").value("about-me"))
                .andExpect(jsonPath("$.screeningAnswers[0].answer").value("Exported answer"));
    }

    @Test
    @DisplayName("Account deletion removes screening answers (RODO)")
    void deleteAccount_removesScreeningAnswers() throws Exception {
        saveAnswers(List.of(answer("about-me", null, "To be deleted", false)));
        assertFalse(screeningAnswerRepository.findByUserIdOrderBySortOrder(testUser.getId()).isEmpty());

        mockMvc.perform(delete("/api/auth/me"))
                .andExpect(status().isNoContent());

        assertTrue(screeningAnswerRepository.findByUserIdOrderBySortOrder(testUser.getId()).isEmpty());
    }


    private org.springframework.test.web.servlet.ResultActions saveAnswers(List<Map<String, Object>> answers) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("answers", answers);
        return mockMvc.perform(put("/api/screening-answers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private Map<String, Object> answer(String questionKey, String label, String text, boolean custom) {
        Map<String, Object> m = new HashMap<>();
        m.put("questionKey", questionKey);
        m.put("label", label);
        m.put("answer", text);
        m.put("custom", custom);
        return m;
    }

    private User createUser(String email, String googleId) {
        User user = new User(email, "Test User", googleId);
        user.acceptPrivacyPolicy();
        return userRepository.save(user);
    }

    private void authenticateAs(User user) {
        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getName());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList()));
        TestSecurityContextHolder.setContext(ctx);
    }
}
