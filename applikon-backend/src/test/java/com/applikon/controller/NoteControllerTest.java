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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.TestSecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class NoteControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private NoteRepository noteRepository;
    @Autowired private UserRepository userRepository;

    private Application testApplication;
    private User testUser;

    @BeforeEach
    void setUp() {
        noteRepository.deleteAll();
        applicationRepository.deleteAll();
        cvRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User("test@example.com", "Test User", "google-test-note");
        testUser.acceptPrivacyPolicy();
        testUser = userRepository.save(testUser);

        AuthenticatedUser principal = new AuthenticatedUser(
                testUser.getId(), testUser.getEmail(), testUser.getName());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, Collections.emptyList()));
        TestSecurityContextHolder.setContext(ctx);

        testApplication = createTestApplication();
    }

    @AfterEach
    void tearDown() {
        TestSecurityContextHolder.clearContext();
    }

    // Step 5: Notes Tests

    @Test
    @Order(1)
    @DisplayName("POST /api/applications/{id}/notes - creates note of category QUESTIONS")
    void createNote_CategoryQuestions_Success() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("content", "Pytali o Spring Boot i Docker");
        request.put("category", "QUESTIONS");

        mockMvc.perform(post("/api/applications/" + testApplication.getId() + "/notes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.content").value("Pytali o Spring Boot i Docker"))
                .andExpect(jsonPath("$.category").value("QUESTIONS"))
                .andExpect(jsonPath("$.applicationId").value(testApplication.getId()))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/applications/{id}/notes - creates note of category FEEDBACK")
    void createNote_CategoryFeedback_Success() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("content", "Pozytywny feedback od rekrutera");
        request.put("category", "FEEDBACK");

        mockMvc.perform(post("/api/applications/" + testApplication.getId() + "/notes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("FEEDBACK"));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/applications/{id}/notes - creates note of category OTHER")
    void createNote_CategoryInne_Success() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("content", "Kontakt: rekruter@example.com");
        request.put("category", "OTHER");

        mockMvc.perform(post("/api/applications/" + testApplication.getId() + "/notes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("OTHER"));
    }

    @Test
    @Order(4)
    @DisplayName("POST /api/applications/{id}/notes - validation: empty note returns 400")
    void createNote_EmptyContent_ReturnsBadRequest() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("content", "");
        request.put("category", "OTHER");

        mockMvc.perform(post("/api/applications/" + testApplication.getId() + "/notes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content").value(containsString("required")));
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/applications/{id}/notes - returns notes sorted newest first")
    void getNotes_ReturnsSortedByDateDesc() throws Exception {
        createTestNote("Notatka 1", NoteCategory.QUESTIONS);
        Thread.sleep(10);
        createTestNote("Notatka 2", NoteCategory.FEEDBACK);
        Thread.sleep(10);
        createTestNote("Notatka 3", NoteCategory.OTHER);

        mockMvc.perform(get("/api/applications/" + testApplication.getId() + "/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].content").value("Notatka 3"))
                .andExpect(jsonPath("$[1].content").value("Notatka 2"))
                .andExpect(jsonPath("$[2].content").value("Notatka 1"));
    }

    @Test
    @Order(6)
    @DisplayName("PUT /api/notes/{id} - updates note content and category")
    void updateNote_ChangesContentAndCategory() throws Exception {
        Note note = createTestNote("Stara tresc", NoteCategory.OTHER);

        Map<String, Object> updateRequest = new HashMap<>();
        updateRequest.put("content", "Nowa tresc notatki");
        updateRequest.put("category", "QUESTIONS");

        mockMvc.perform(put("/api/notes/" + note.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Nowa tresc notatki"))
                .andExpect(jsonPath("$.category").value("QUESTIONS"));
    }

    @Test
    @Order(7)
    @DisplayName("DELETE /api/notes/{id} - removes note")
    void deleteNote_RemovesFromDatabase() throws Exception {
        Note note = createTestNote("Do usuniecia", NoteCategory.OTHER);
        Long id = note.getId();

        mockMvc.perform(delete("/api/notes/" + id))
                .andExpect(status().isNoContent());

        assertFalse(noteRepository.findById(id).isPresent());
    }

    @Test
    @Order(8)
    @DisplayName("GET /api/applications/{id}/notes - returns empty list when no notes")
    void getNotes_NoNotes_ReturnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/applications/" + testApplication.getId() + "/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @Order(9)
    @DisplayName("POST /api/applications/{id}/notes - defaults to category OTHER when not provided")
    void createNote_NoCategoryProvided_DefaultsToInne() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("content", "Notatka bez kategorii");

        mockMvc.perform(post("/api/applications/" + testApplication.getId() + "/notes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("OTHER"));
    }


    private Application createTestApplication() {
        Application app = new Application();
        app.setCompany("TestCompany");
        app.setPosition("TestPosition");
        app.setSalaryMin(5000);
        app.setCurrency("PLN");
        app.setStatus(ApplicationStatus.SENT);
        app.setUser(testUser);
        return applicationRepository.save(app);
    }

    private Note createTestNote(String content, NoteCategory category) {
        Note note = new Note();
        note.setContent(content);
        note.setCategory(category);
        note.setApplication(testApplication);
        note.setCreatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }
}
