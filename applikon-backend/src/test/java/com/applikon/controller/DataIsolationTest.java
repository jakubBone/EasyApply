package com.applikon.controller;

import com.applikon.entity.*;
import com.applikon.repository.*;
import com.applikon.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
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
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The one suite that would catch a missing userId in a repository query. Each test seeds data
// as userA, switches to userB, and expects the resource to be invisible, not merely read-only.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Data isolation between users")
class DataIsolationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private NoteRepository noteRepository;
    @Autowired private CVRepository cvRepository;

    private User userA;
    private User userB;

    @BeforeEach
    void setUp() {
        noteRepository.deleteAll();
        applicationRepository.deleteAll();
        cvRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new User("a@example.com", "User A", "google-a"));
        userA.acceptPrivacyPolicy();
        userA = userRepository.save(userA);

        userB = userRepository.save(new User("b@example.com", "User B", "google-b"));
        userB.acceptPrivacyPolicy();
        userB = userRepository.save(userB);
    }

    @AfterEach
    void tearDown() {
        TestSecurityContextHolder.clearContext();
    }


    @Test
    @DisplayName("GET /api/applications/{id} - user B cannot read user A's application")
    void getApplication_asOtherUser_returns404() throws Exception {
        Application app = applicationOf(userA);
        authenticateAs(userB);

        mockMvc.perform(get("/api/applications/" + app.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/applications/{id} - user B cannot update user A's application")
    void updateApplication_asOtherUser_returns404() throws Exception {
        Application app = applicationOf(userA);
        authenticateAs(userB);

        String body = objectMapper.writeValueAsString(
                Map.of("company", "Hacked", "position", "Hacked"));

        mockMvc.perform(put("/api/applications/" + app.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/applications/{id} - user B cannot delete user A's application")
    void deleteApplication_asOtherUser_returns404() throws Exception {
        Application app = applicationOf(userA);
        authenticateAs(userB);

        mockMvc.perform(delete("/api/applications/" + app.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PATCH /api/applications/{id}/status - user B cannot change user A's status")
    void updateStatus_asOtherUser_returns404() throws Exception {
        Application app = applicationOf(userA);
        authenticateAs(userB);

        String body = objectMapper.writeValueAsString(Map.of("status", "IN_PROGRESS"));

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }


    @Test
    @DisplayName("GET /api/applications/{id}/notes - user B cannot read user A's notes")
    void getNotes_asOtherUser_returns404() throws Exception {
        Application app = applicationOf(userA);
        authenticateAs(userB);

        mockMvc.perform(get("/api/applications/" + app.getId() + "/notes"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/applications/{id}/notes - user B cannot add note to user A's application")
    void createNote_asOtherUser_returns404() throws Exception {
        Application app = applicationOf(userA);
        authenticateAs(userB);

        String body = objectMapper.writeValueAsString(Map.of("content", "hacked"));

        mockMvc.perform(post("/api/applications/" + app.getId() + "/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/notes/{id} - user B cannot delete user A's note")
    void deleteNote_asOtherUser_returns404() throws Exception {
        Application app = applicationOf(userA);
        Note note = noteRepository.save(new Note("secret", app, NoteCategory.OTHER));
        authenticateAs(userB);

        mockMvc.perform(delete("/api/notes/" + note.getId()))
                .andExpect(status().isNotFound());
    }


    @Test
    @DisplayName("GET /api/cv/{id} - user B cannot read user A's CV")
    void getCV_asOtherUser_returns404() throws Exception {
        CV cv = cvOf(userA);
        authenticateAs(userB);

        mockMvc.perform(get("/api/cv/" + cv.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/cv/{id} - user B cannot delete user A's CV")
    void deleteCV_asOtherUser_returns404() throws Exception {
        CV cv = cvOf(userA);
        authenticateAs(userB);

        mockMvc.perform(delete("/api/cv/" + cv.getId()))
                .andExpect(status().isNotFound());
    }


    private void authenticateAs(User user) {
        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getName());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, Collections.emptyList()));
        TestSecurityContextHolder.setContext(ctx);
    }

    private Application applicationOf(User user) {
        Application app = new Application();
        app.setUser(user);
        app.setCompany("Secret Corp");
        app.setPosition("Developer");
        app.setSalaryMin(10000);
        app.setCurrency("PLN");
        app.setStatus(ApplicationStatus.SENT);
        return applicationRepository.save(app);
    }

    private CV cvOf(User user) {
        CV cv = new CV();
        cv.setUser(user);
        cv.setType(CVType.NOTE);
        cv.setOriginalFileName("secret-cv.pdf");
        return cvRepository.save(cv);
    }
}
