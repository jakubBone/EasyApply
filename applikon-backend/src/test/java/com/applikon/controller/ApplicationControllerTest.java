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
class ApplicationControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private NoteRepository noteRepository;
    @Autowired private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        noteRepository.deleteAll();
        applicationRepository.deleteAll();
        cvRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User("test@example.com", "Test User", "google-test-app");
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

    // ==================== STEP 1: CRUD Tests ====================

    @Test
    @Order(1)
    @DisplayName("POST /api/applications - creates application with salary range")
    void createApplication_WithSalaryRange_ReturnsCreated() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("company", "Google");
        request.put("position", "Junior Java Dev");
        request.put("salaryMin", 8000);
        request.put("salaryMax", 12000);
        request.put("currency", "PLN");
        request.put("salaryType", "GROSS");
        request.put("contractType", "B2B");
        request.put("link", "https://careers.google.com/123");
        request.put("source", "LinkedIn");
        request.put("jobDescription", "Java 11+, Spring Boot, Docker");

        mockMvc.perform(post("/api/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.company").value("Google"))
                .andExpect(jsonPath("$.position").value("Junior Java Dev"))
                .andExpect(jsonPath("$.salaryMin").value(8000))
                .andExpect(jsonPath("$.salaryMax").value(12000))
                .andExpect(jsonPath("$.currency").value("PLN"))
                .andExpect(jsonPath("$.salaryType").value("GROSS"))
                .andExpect(jsonPath("$.contractType").value("B2B"))
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.appliedAt").exists());
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/applications - validation: missing company returns 400")
    void createApplication_WithoutCompany_ReturnsBadRequest() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("position", "Dev");
        request.put("salaryMin", 5000);
        request.put("currency", "PLN");

        mockMvc.perform(post("/api/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.company").value(containsString("Company name")));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/applications - validation: negative salary returns 400")
    void createApplication_WithNegativeSalary_ReturnsBadRequest() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("company", "Test");
        request.put("position", "Dev");
        request.put("salaryMin", -5000);

        mockMvc.perform(post("/api/applications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.salaryMin").value(containsString("positive")));
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/applications - returns list of applications")
    void getAllApplications_ReturnsListOfApplications() throws Exception {
        createTestApplication("Google", "Dev");
        createTestApplication("Meta", "Engineer");

        mockMvc.perform(get("/api/applications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].company", containsInAnyOrder("Google", "Meta")));
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/applications/{id} - returns application details")
    void getApplicationById_ReturnsApplication() throws Exception {
        Application app = createTestApplication("Google", "Dev");

        mockMvc.perform(get("/api/applications/" + app.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company").value("Google"))
                .andExpect(jsonPath("$.position").value("Dev"));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/applications/{id} - non-existent ID returns 404")
    void getApplicationById_NotFound_Returns404() throws Exception {
        mockMvc.perform(get("/api/applications/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value(containsString("not found")));
    }

    @Test
    @Order(7)
    @DisplayName("PUT /api/applications/{id} - updates application")
    void updateApplication_ReturnsUpdatedApplication() throws Exception {
        Application app = createTestApplication("Google", "Dev");

        Map<String, Object> updateRequest = new HashMap<>();
        updateRequest.put("company", "Google Updated");
        updateRequest.put("position", "Senior Dev");
        updateRequest.put("salaryMin", 15000);
        updateRequest.put("salaryMax", 20000);
        updateRequest.put("currency", "EUR");

        mockMvc.perform(put("/api/applications/" + app.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company").value("Google Updated"))
                .andExpect(jsonPath("$.position").value("Senior Dev"))
                .andExpect(jsonPath("$.salaryMin").value(15000))
                .andExpect(jsonPath("$.salaryMax").value(20000))
                .andExpect(jsonPath("$.currency").value("EUR"));
    }

    @Test
    @Order(8)
    @DisplayName("DELETE /api/applications/{id} - removes application")
    void deleteApplication_RemovesFromDatabase() throws Exception {
        Application app = createTestApplication("ToDelete", "Dev");
        Long id = app.getId();

        mockMvc.perform(delete("/api/applications/" + id))
                .andExpect(status().isNoContent());

        assertFalse(applicationRepository.findById(id).isPresent());
    }

    // ==================== Step 2: Duplicates ====================

    @Test
    @Order(9)
    @DisplayName("GET /api/applications/check-duplicate - detects duplicates")
    void checkDuplicate_FindsExistingApplication() throws Exception {
        createTestApplication("Google", "Junior Dev");

        mockMvc.perform(get("/api/applications/check-duplicate")
                .param("company", "Google")
                .param("position", "Junior Dev"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].company").value("Google"));
    }

    @Test
    @Order(10)
    @DisplayName("GET /api/applications/check-duplicate - duplicates are case-insensitive")
    void checkDuplicate_CaseInsensitive() throws Exception {
        createTestApplication("Google", "Junior Dev");

        mockMvc.perform(get("/api/applications/check-duplicate")
                .param("company", "GOOGLE")
                .param("position", "junior dev"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    // ==================== STEP 3: Kanban - status change ====================

    @Test
    @Order(11)
    @DisplayName("PATCH /api/applications/{id}/status - changes application status")
    void updateStatus_ChangesApplicationStatus() throws Exception {
        Application app = createTestApplication("Google", "Dev");

        Map<String, Object> statusRequest = new HashMap<>();
        statusRequest.put("status", "IN_PROGRESS");

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statusRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @Order(12)
    @DisplayName("PATCH /api/applications/{id}/stage - transition to W_PROCESIE with stage")
    void updateStage_ToInProcess_SetsStage() throws Exception {
        Application app = createTestApplication("Google", "Dev");

        Map<String, Object> stageRequest = new HashMap<>();
        stageRequest.put("status", "IN_PROGRESS");
        stageRequest.put("currentStage", "Rozmowa z HR");

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.currentStage").value("Rozmowa z HR"));
    }

    @Test
    @Order(13)
    @DisplayName("PATCH /api/applications/{id}/stage - changes current stage")
    void updateStage_ChangeStage_UpdatesCurrentStage() throws Exception {
        Application app = createTestApplication("Google", "Dev");
        app.setStatus(ApplicationStatus.IN_PROGRESS);
        app.setCurrentStage("Rozmowa z HR");
        applicationRepository.save(app);

        Map<String, Object> stageRequest = new HashMap<>();
        stageRequest.put("status", "IN_PROGRESS");
        stageRequest.put("currentStage", "Rozmowa techniczna");

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStage").value("Rozmowa techniczna"));
    }

    @Test
    @Order(14)
    @DisplayName("PATCH /api/applications/{id}/stage - transition to ODMOWA with rejection reason")
    void updateStage_ToRejection_SetsReason() throws Exception {
        Application app = createTestApplication("Google", "Dev");

        Map<String, Object> stageRequest = new HashMap<>();
        stageRequest.put("status", "REJECTED");
        stageRequest.put("rejectionReason", "NO_RESPONSE");

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("NO_RESPONSE"));
    }

    @Test
    @Order(15)
    @DisplayName("PATCH /api/applications/{id}/stage - transition to OFERTA")
    void updateStage_ToOffer_SetsStatus() throws Exception {
        Application app = createTestApplication("Google", "Dev");

        Map<String, Object> stageRequest = new HashMap<>();
        stageRequest.put("status", "OFFER");

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OFFER"));
    }

    @Test
    @Order(16)
    @DisplayName("PATCH /api/applications/{id}/stage - rollback to WYSLANE clears stage data")
    void updateStage_BackToSent_ClearsData() throws Exception {
        Application app = createTestApplication("Google", "Dev");
        app.setStatus(ApplicationStatus.REJECTED);
        app.setRejectionReason(RejectionReason.NO_RESPONSE);
        app.setCurrentStage("Rozmowa techniczna");
        applicationRepository.save(app);

        Map<String, Object> stageRequest = new HashMap<>();
        stageRequest.put("status", "SENT");
        stageRequest.put("currentStage", null);
        stageRequest.put("rejectionReason", null);

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.currentStage").isEmpty())
                .andExpect(jsonPath("$.rejectionReason").isEmpty());
    }

    @Test
    @Order(17)
    @DisplayName("POST /api/applications/{id}/stage - adds new stage to history")
    void addStage_AddsNewStageToHistory() throws Exception {
        Application app = createTestApplication("Google", "Dev");
        app.setStatus(ApplicationStatus.IN_PROGRESS);
        applicationRepository.save(app);

        Map<String, Object> stageRequest = new HashMap<>();
        stageRequest.put("stageName", "Rozmowa z CEO");

        mockMvc.perform(post("/api/applications/" + app.getId() + "/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStage").value("Rozmowa z CEO"));
    }

    @Test
    @Order(18)
    @DisplayName("POST /api/applications/{id}/stage - returns 404 for non-existent application")
    void addStage_NotFound_Returns404() throws Exception {
        Map<String, Object> stageRequest = new HashMap<>();
        stageRequest.put("stageName", "Test");

        mockMvc.perform(post("/api/applications/99999/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(21)
    @DisplayName("PATCH /api/applications/{id}/stage - null status returns 400")
    void updateStage_NullStatus_ReturnsBadRequest() throws Exception {
        // CR-B2: @NotNull on StageUpdateRequest.status must produce 400, not 500 (NPE)
        Application app = createTestApplication("Google", "Dev");

        Map<String, Object> stageRequest = new HashMap<>();
        // status is intentionally omitted — server receives null

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/stage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(stageRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").exists());
    }

    // ==================== STEP 4: CV Assignment ====================

    @Test
    @Order(19)
    @DisplayName("PATCH /api/applications/{id}/cv - assigns CV to application")
    void assignCV_ToApplication_Success() throws Exception {
        Application app = createTestApplication("Google", "Dev");
        CV cv = createTestCV("TestCV.pdf", CVType.NOTE);

        Map<String, Object> cvRequest = new HashMap<>();
        cvRequest.put("cvId", cv.getId());

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/cv")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cvRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cvId").value(cv.getId()))
                .andExpect(jsonPath("$.cvFileName").value("TestCV.pdf"));
    }

    @Test
    @Order(20)
    @DisplayName("PATCH /api/applications/{id}/cv - removes CV assignment (null)")
    void removeCV_FromApplication_Success() throws Exception {
        CV cv = createTestCV("TestCV.pdf", CVType.NOTE);
        Application app = createTestApplication("Google", "Dev");
        app.setCv(cv);
        applicationRepository.save(app);

        Map<String, Object> cvRequest = new HashMap<>();
        cvRequest.put("cvId", null);

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/cv")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cvRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cvId").isEmpty())
                .andExpect(jsonPath("$.cvFileName").isEmpty());
    }

    // ==================== Helper methods ====================

    private Application createTestApplication(String company, String position) {
        Application app = new Application();
        app.setCompany(company);
        app.setPosition(position);
        app.setSalaryMin(5000);
        app.setCurrency("PLN");
        app.setStatus(ApplicationStatus.SENT);
        app.setUser(testUser);
        return applicationRepository.save(app);
    }

    private CV createTestCV(String name, CVType type) {
        CV cv = new CV();
        cv.setOriginalFileName(name);
        cv.setType(type);
        cv.setUser(testUser);
        return cvRepository.save(cv);
    }
}
