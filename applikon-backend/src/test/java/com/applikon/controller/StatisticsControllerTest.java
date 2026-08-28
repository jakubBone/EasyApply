package com.applikon.controller;

import com.applikon.entity.*;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CVRepository;
import com.applikon.repository.NoteRepository;
import com.applikon.repository.UserRepository;
import com.applikon.security.AuthenticatedUser;
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

import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class StatisticsControllerTest {

    @Autowired private MockMvc mockMvc;
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

        testUser = new User("test@example.com", "Test User", "google-test-stats");
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

    // Step 7: Gamification Tests

    @Test
    @Order(1)
    @DisplayName("GET /api/statistics/badges - returns badge stats (no data)")
    void getBadges_NoData_ReturnsZeros() throws Exception {
        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRejections").value(0))
                .andExpect(jsonPath("$.totalGhosting").value(0))
                .andExpect(jsonPath("$.totalOffers").value(0))
                .andExpect(jsonPath("$.sweetRevengeUnlocked").value(false))
                .andExpect(jsonPath("$.rejectionBadge.name").isEmpty())
                .andExpect(jsonPath("$.ghostingBadge.name").isEmpty());
    }

    @Test
    @Order(2)
    @DisplayName("GET /api/statistics/badges - first rejection badge unlocked at 5 rejections")
    void getBadges_5Rejections_ReturnsFirstRejectionBadge() throws Exception {
        for (int i = 0; i < 5; i++) {
            createRejectedApplication("Company" + i, RejectionReason.EMAIL_REJECTION);
        }

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRejections").value(5))
                .andExpect(jsonPath("$.rejectionBadge.name").value("Rękawica"))
                .andExpect(jsonPath("$.rejectionBadge.icon").exists())
                .andExpect(jsonPath("$.rejectionBadge.threshold").value(5))
                .andExpect(jsonPath("$.rejectionBadge.nextThreshold").value(10))
                .andExpect(jsonPath("$.rejectionBadge.nextBadgeName").value("Patelnia"));
    }

    @Test
    @Order(3)
    @DisplayName("GET /api/statistics/badges - second rejection badge unlocked at 10 rejections")
    void getBadges_10Rejections_ReturnsPatelnia() throws Exception {
        for (int i = 0; i < 10; i++) {
            createRejectedApplication("Company" + i, RejectionReason.EMAIL_REJECTION);
        }

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRejections").value(10))
                .andExpect(jsonPath("$.rejectionBadge.name").value("Patelnia"))
                .andExpect(jsonPath("$.rejectionBadge.threshold").value(10))
                .andExpect(jsonPath("$.rejectionBadge.nextThreshold").value(25));
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/statistics/badges - first ghosting badge unlocked at 5 ghostings")
    void getBadges_5Ghostings_ReturnsWidmo() throws Exception {
        for (int i = 0; i < 5; i++) {
            createRejectedApplication("Company" + i, RejectionReason.NO_RESPONSE);
        }

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalGhosting").value(5))
                .andExpect(jsonPath("$.ghostingBadge.name").value("Widmo"))
                .andExpect(jsonPath("$.ghostingBadge.threshold").value(5))
                .andExpect(jsonPath("$.ghostingBadge.nextThreshold").value(15))
                .andExpect(jsonPath("$.ghostingBadge.nextBadgeName").value("Cierpliwy Mnich"));
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/statistics/badges - Sweet Revenge unlocked with 10+ rejections and 1 offer")
    void getBadges_10RejectionsAnd1Offer_UnlocksSweetRevenge() throws Exception {
        for (int i = 0; i < 10; i++) {
            createRejectedApplication("Company" + i, RejectionReason.EMAIL_REJECTION);
        }
        createOfferApplication("SuccessCompany");

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRejections").value(10))
                .andExpect(jsonPath("$.totalOffers").value(1))
                .andExpect(jsonPath("$.sweetRevengeUnlocked").value(true));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/statistics/badges - Sweet Revenge NOT unlocked with 5 rejections and 1 offer")
    void getBadges_5RejectionsAnd1Offer_SweetRevengeNotUnlocked() throws Exception {
        for (int i = 0; i < 5; i++) {
            createRejectedApplication("Company" + i, RejectionReason.EMAIL_REJECTION);
        }
        createOfferApplication("SuccessCompany");

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRejections").value(5))
                .andExpect(jsonPath("$.totalOffers").value(1))
                .andExpect(jsonPath("$.sweetRevengeUnlocked").value(false));
    }

    @Test
    @Order(7)
    @DisplayName("GET /api/statistics/badges - different rejection types counted separately")
    void getBadges_MixedRejectionTypes_CountedCorrectly() throws Exception {
        for (int i = 0; i < 3; i++) {
            createRejectedApplication("Ghost" + i, RejectionReason.NO_RESPONSE);
        }
        for (int i = 0; i < 2; i++) {
            createRejectedApplication("Mail" + i, RejectionReason.EMAIL_REJECTION);
        }

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRejections").value(5))
                .andExpect(jsonPath("$.totalGhosting").value(3));
    }

    @Test
    @Order(8)
    @DisplayName("GET /api/statistics/badges - shows progress toward next badge")
    void getBadges_ShowsProgressToNextBadge() throws Exception {
        for (int i = 0; i < 7; i++) {
            createRejectedApplication("Company" + i, RejectionReason.EMAIL_REJECTION);
        }

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectionBadge.name").value("Rękawica"))
                .andExpect(jsonPath("$.rejectionBadge.currentCount").value(7))
                .andExpect(jsonPath("$.rejectionBadge.nextThreshold").value(10))
                .andExpect(jsonPath("$.rejectionBadge.nextBadgeName").value("Patelnia"));
    }

    @Test
    @Order(9)
    @DisplayName("GET /api/statistics/badges - counts only REJECTED status (not SENT/IN_PROGRESS)")
    void getBadges_OnlyCountsRejectedStatus() throws Exception {
        createRejectedApplication("Rejected1", RejectionReason.EMAIL_REJECTION);
        createRejectedApplication("Rejected2", RejectionReason.EMAIL_REJECTION);

        createTestApplication("Sent", ApplicationStatus.SENT);
        createTestApplication("InProcess", ApplicationStatus.IN_PROGRESS);
        createOfferApplication("Offer");

        mockMvc.perform(get("/api/statistics/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRejections").value(2))
                .andExpect(jsonPath("$.totalOffers").value(1));
    }


    private Application createRejectedApplication(String company, RejectionReason reason) {
        Application app = new Application();
        app.setCompany(company);
        app.setPosition("Developer");
        app.setSalaryMin(5000);
        app.setCurrency("PLN");
        app.setStatus(ApplicationStatus.REJECTED);
        app.setRejectionReason(reason);
        app.setUser(testUser);
        return applicationRepository.save(app);
    }

    private Application createOfferApplication(String company) {
        Application app = new Application();
        app.setCompany(company);
        app.setPosition("Developer");
        app.setSalaryMin(5000);
        app.setCurrency("PLN");
        app.setStatus(ApplicationStatus.OFFER);
        app.setUser(testUser);
        return applicationRepository.save(app);
    }

    private Application createTestApplication(String company, ApplicationStatus status) {
        Application app = new Application();
        app.setCompany(company);
        app.setPosition("Developer");
        app.setSalaryMin(5000);
        app.setCurrency("PLN");
        app.setStatus(status);
        app.setUser(testUser);
        return applicationRepository.save(app);
    }
}
