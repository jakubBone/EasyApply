package com.applikon.controller;

import com.applikon.entity.ServiceNotice;
import com.applikon.entity.ServiceNoticeType;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CVRepository;
import com.applikon.repository.NoteRepository;
import com.applikon.repository.ServiceNoticeRepository;
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

import java.time.LocalDateTime;
import java.util.Collections;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SystemControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ServiceNoticeRepository noticeRepository;
    @Autowired private NoteRepository noteRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        noticeRepository.deleteAll();
        noteRepository.deleteAll();
        applicationRepository.deleteAll();
        cvRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User("test@example.com", "Test User", "google-test");
        user.acceptPrivacyPolicy();
        user = userRepository.save(user);

        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getName());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, Collections.emptyList()));
        TestSecurityContextHolder.setContext(ctx);
    }

    @Test
    @Order(1)
    void getActiveNotices_noNotices_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/system/notices/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @Order(2)
    void getActiveNotices_withActiveNotice_returnsIt() throws Exception {
        ServiceNotice notice = new ServiceNotice();
        notice.setType(ServiceNoticeType.BANNER);
        notice.setMessagePl("Testowy komunikat");
        notice.setMessageEn("Test message");
        noticeRepository.save(notice);

        mockMvc.perform(get("/api/system/notices/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].type").value("BANNER"))
                .andExpect(jsonPath("$[0].messagePl").value("Testowy komunikat"));
    }

    @Test
    @Order(3)
    void getActiveNotices_expiredNotice_notReturned() throws Exception {
        ServiceNotice notice = new ServiceNotice();
        notice.setType(ServiceNoticeType.MODAL);
        notice.setMessagePl("Wygasły komunikat");
        notice.setMessageEn("Expired message");
        notice.setExpiresAt(LocalDateTime.now().minusHours(1));
        noticeRepository.save(notice);

        mockMvc.perform(get("/api/system/notices/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
