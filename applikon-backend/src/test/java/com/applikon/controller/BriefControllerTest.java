package com.applikon.controller;

import com.applikon.dto.BriefFieldResponse;
import com.applikon.dto.BriefResponse;
import com.applikon.entity.Application;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CVRepository;
import com.applikon.repository.CompanyBriefFieldRepository;
import com.applikon.repository.CompanyBriefRepository;
import com.applikon.repository.NoteRepository;
import com.applikon.repository.ScreeningAnswerRepository;
import com.applikon.repository.UserRepository;
import com.applikon.security.AuthenticatedUser;
import com.applikon.service.ai.FakeBriefChatModel;
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
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("BriefController tests")
class BriefControllerTest {

    private static final String COMPANY = "Acme";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private CompanyBriefFieldRepository briefFieldRepository;
    @Autowired private CompanyBriefRepository briefRepository;
    @Autowired private ScreeningAnswerRepository screeningAnswerRepository;
    @Autowired private NoteRepository noteRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private FakeBriefChatModel fakeBriefChatModel;

    private User testUser;

    @BeforeEach
    void setUp() {
        briefFieldRepository.deleteAll();
        briefRepository.deleteAll();
        screeningAnswerRepository.deleteAll();
        noteRepository.deleteAll();
        applicationRepository.deleteAll();
        cvRepository.deleteAll();
        userRepository.deleteAll();

        fakeBriefChatModel.setFailNext(false);   // reset the shared fake between tests
        fakeBriefChatModel.setInsufficientNext(false);

        testUser = createUser("test@example.com", "google-brief-a");
        authenticateAs(testUser);
    }

    @AfterEach
    void tearDown() {
        TestSecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("POST generates a brief; GET returns the pitch field")
    void trigger_generatesBrief() throws Exception {
        Long appId = saveApplication(testUser).getId();

        mockMvc.perform(post(url(appId)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING"));   // generation runs in the background

        BriefResponse brief = awaitStatus(appId, "READY");
        assertEquals(1, brief.fields().size());

        BriefFieldResponse pitch = field(brief, "pitch");
        assertEquals("[pl] pitch for Acme", pitch.texts().get("pl"));
        assertEquals("[en] pitch for Acme", pitch.texts().get("en"));
        assertFalse(pitch.edited());
    }

    @Test
    @DisplayName("Not enough public info generates the insufficient marker (null text) in every locale")
    void trigger_insufficientInfo_marksNullEveryLocale() throws Exception {
        Long appId = saveApplication(testUser).getId();

        fakeBriefChatModel.setInsufficientNext(true);
        mockMvc.perform(post(url(appId))).andExpect(status().isAccepted());

        BriefFieldResponse pitch = field(awaitStatus(appId, "READY"), "pitch");
        assertNull(pitch.texts().get("pl"));
        assertNull(pitch.texts().get("en"));
    }

    @Test
    @DisplayName("A second application to the same company reuses the brief (model called once)")
    void trigger_reusesBriefAcrossApplications() throws Exception {
        int callsBefore = fakeBriefChatModel.callCount();

        Long app1 = saveApplication(testUser).getId();
        mockMvc.perform(post(url(app1))).andExpect(status().isAccepted());
        awaitStatus(app1, "READY");

        Long app2 = saveApplication(testUser).getId();   // same company
        mockMvc.perform(post(url(app2)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("READY"));   // cache hit, no new generation

        assertEquals(1, fakeBriefChatModel.callCount() - callsBefore);
    }

    @Test
    @DisplayName("A provider error ends as FAILED; a retry from FAILED succeeds")
    void trigger_failsThenRetries() throws Exception {
        Long appId = saveApplication(testUser).getId();

        fakeBriefChatModel.setFailNext(true);
        mockMvc.perform(post(url(appId))).andExpect(status().isAccepted());
        awaitStatus(appId, "FAILED");

        fakeBriefChatModel.setFailNext(false);
        mockMvc.perform(post(url(appId))).andExpect(status().isAccepted());   // retry allowed from FAILED
        assertEquals("READY", awaitStatus(appId, "READY").status());
    }

    @Test
    @DisplayName("An edit updates the company brief and shows on every application to that company")
    void editFields_updatesBriefGlobally() throws Exception {
        Long app1 = saveApplication(testUser).getId();
        mockMvc.perform(post(url(app1))).andExpect(status().isAccepted());
        awaitStatus(app1, "READY");

        Map<String, Object> body = Map.of("fields", List.of(
                Map.of("fieldKey", "pitch", "text", "My correction")));
        mockMvc.perform(put(url(app1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        // A different application to the same company sees the edit in every language.
        Long app2 = saveApplication(testUser).getId();
        BriefFieldResponse pitch = field(getBrief(app2), "pitch");
        assertEquals("My correction", pitch.texts().get("pl"));
        assertEquals("My correction", pitch.texts().get("en"));
        assertTrue(pitch.edited());
    }

    @Test
    @DisplayName("A brief on an application owned by another user is rejected with 404")
    void trigger_rejectsForeignApplication() throws Exception {
        User otherUser = createUser("other@example.com", "google-brief-b");
        Long foreignAppId = saveApplication(otherUser).getId();   // still authenticated as testUser

        mockMvc.perform(post(url(foreignAppId))).andExpect(status().isNotFound());
        mockMvc.perform(get(url(foreignAppId))).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Data export includes edited brief fields only, not generated text (RODO)")
    void export_includesEditedBriefFieldsOnly() throws Exception {
        Long appId = saveApplication(testUser).getId();
        mockMvc.perform(post(url(appId))).andExpect(status().isAccepted());
        awaitStatus(appId, "READY");

        Map<String, Object> body = Map.of("fields", List.of(
                Map.of("fieldKey", "pitch", "text", "My correction")));
        mockMvc.perform(put(url(appId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/me/export"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.briefFields", hasSize(1)))   // the edited field, not generated text
                .andExpect(jsonPath("$.briefFields[0].company").value(COMPANY))
                .andExpect(jsonPath("$.briefFields[0].fieldKey").value("pitch"))
                .andExpect(jsonPath("$.briefFields[0].text").value("My correction"));
    }


    private String url(Long applicationId) {
        return "/api/applications/" + applicationId + "/brief";
    }

    // Polls GET until the brief reaches the expected status (generation is async).
    private BriefResponse awaitStatus(Long applicationId, String expected) throws Exception {
        BriefResponse brief = null;
        for (int i = 0; i < 50; i++) {
            brief = getBrief(applicationId);
            if (expected.equals(brief.status())) {
                return brief;
            }
            Thread.sleep(100);
        }
        fail("Brief never reached " + expected + " (last status: " + (brief == null ? "none" : brief.status()) + ")");
        return brief;
    }

    private BriefResponse getBrief(Long applicationId) throws Exception {
        String json = mockMvc.perform(get(url(applicationId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readValue(json, BriefResponse.class);
    }

    private BriefFieldResponse field(BriefResponse brief, String key) {
        return brief.fields().stream()
                .filter(f -> f.key().equals(key))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing brief field: " + key));
    }

    private Application saveApplication(User owner) {
        Application application = new Application();
        application.setUser(owner);
        application.setCompany(COMPANY);
        application.setPosition("Backend Developer");
        application.setLink("http://job");
        return applicationRepository.save(application);
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
