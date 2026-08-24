package com.applikon.service;

import com.applikon.dto.ApplicationRequest;
import com.applikon.dto.ApplicationResponse;
import com.applikon.dto.StageUpdateRequest;
import com.applikon.entity.Application;
import com.applikon.entity.ApplicationStatus;
import com.applikon.entity.ContractType;
import com.applikon.entity.RejectionReason;
import com.applikon.entity.SalaryType;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.MessageSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.lenient;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApplicationService tests")
class ApplicationServiceTest {

    private static final UUID TEST_USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private NoteService noteService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MessageSource messageSource;

    @InjectMocks
    private ApplicationService applicationService;

    @Captor
    private ArgumentCaptor<Application> appCaptor;

    private User testUser;

    @BeforeEach
    void setUp() {
        lenient().when(messageSource.getMessage(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(java.util.Locale.class)))
                .thenAnswer(inv -> {
                    String key = inv.getArgument(0);
                    Object[] args = inv.getArgument(1);
                    if (args != null) {
                        String result = key;
                        for (Object arg : args) result += " " + arg;
                        return result;
                    }
                    return key;
                });
        testUser = new User("test@example.com", "Test User", "google-123");
        setField(testUser, "id", TEST_USER_ID);
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    private static Application app(long id, String company, String position) {
        Application app = new Application();
        setField(app, "id", id);
        app.setCompany(company);
        app.setPosition(position);
        app.setSalaryMin(10000);
        app.setSalaryMax(15000);
        app.setCurrency("PLN");
        app.setSalaryType(SalaryType.GROSS);
        app.setContractType(ContractType.B2B);
        app.setStatus(ApplicationStatus.SENT);
        return app;
    }

    private static ApplicationRequest request(String company, String position) {
        return new ApplicationRequest(
                company,
                position,
                "https://example.com/job",
                null,
                10000,
                15000,
                "PLN",
                SalaryType.GROSS,
                ContractType.B2B,
                "LinkedIn",
                "Java + Spring"
        );
    }

    @Nested
    class CreateTests {

        @Test
        void create_savesEntityAndReturnsResponse() {
            Application saved = app(1L, "Google", "Java Dev");

            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(testUser));
            when(applicationRepository.save(any(Application.class))).thenReturn(saved);
            when(applicationRepository.findByIdAndUserId(1L, TEST_USER_ID)).thenReturn(Optional.of(saved));

            ApplicationResponse response = applicationService.create(request("Google", "Java Dev"), TEST_USER_ID);

            verify(applicationRepository).save(appCaptor.capture());

            Application captured = appCaptor.getValue();
            assertEquals("Google", captured.getCompany());
            assertEquals("Java Dev", captured.getPosition());
            assertEquals(ApplicationStatus.SENT, captured.getStatus());
            assertNotNull(captured.getUser());
            assertEquals("Google", response.company());
        }

        @Test
        void create_throwsWhenUserDoesNotExist() {
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.empty());

            assertThrows(
                    EntityNotFoundException.class,
                    () -> applicationService.create(request("Google", "Java Dev"), TEST_USER_ID)
            );

            verify(applicationRepository, never()).save(any(Application.class));
        }
    }

    @Nested
    class FindTests {

        @Test
        void findById_returnsResponse() {
            Application app = app(1L, "Google", "Developer");
            when(applicationRepository.findByIdAndUserId(1L, TEST_USER_ID)).thenReturn(Optional.of(app));

            ApplicationResponse response = applicationService.findById(1L, TEST_USER_ID);

            assertEquals("Google", response.company());
            assertEquals("Developer", response.position());
        }

        @Test
        void findAllByUserId_returnsMappedList() {
            when(applicationRepository.findByUserId(TEST_USER_ID))
                    .thenReturn(List.of(
                            app(1L, "Google", "Dev"),
                            app(2L, "Meta", "Engineer")
                    ));

            List<ApplicationResponse> result = applicationService.findAllByUserId(TEST_USER_ID);

            assertEquals(2, result.size());
            assertEquals("Google", result.get(0).company());
        }

        @Test
        void findDuplicates_usesUserIdBasedRepositoryMethod() {
            when(applicationRepository.findByUserIdAndCompanyIgnoreCaseAndPositionIgnoreCase(
                    TEST_USER_ID, "GOOGLE", "developer"
            )).thenReturn(List.of(app(3L, "Google", "Developer")));

            List<ApplicationResponse> result = applicationService.findDuplicates(TEST_USER_ID, "GOOGLE", "developer");

            assertEquals(1, result.size());
            assertEquals("Google", result.get(0).company());
        }
    }

    @Nested
    class UpdateTests {

        @Test
        void update_updatesAllCoreFields() {
            Application existing = app(10L, "Old", "Old Position");
            when(applicationRepository.findByIdAndUserId(10L, TEST_USER_ID)).thenReturn(Optional.of(existing));
            when(applicationRepository.save(any(Application.class))).thenReturn(existing);

            ApplicationRequest updateRequest = new ApplicationRequest(
                    "New Co",
                    "Senior Dev",
                    "https://new.example.com",
                    null,
                    20000,
                    30000,
                    "EUR",
                    SalaryType.NET,
                    ContractType.EMPLOYMENT,
                    "Referral",
                    "Updated desc"
            );

            ApplicationResponse response = applicationService.update(10L, updateRequest, TEST_USER_ID);

            verify(applicationRepository).save(appCaptor.capture());
            Application captured = appCaptor.getValue();

            assertEquals("New Co", captured.getCompany());
            assertEquals("Senior Dev", captured.getPosition());
            assertEquals(20000, captured.getSalaryMin());
            assertEquals("EUR", captured.getCurrency());
            assertEquals("New Co", response.company());
        }

        @Test
        void updateStage_toRejection_setsRejectionData() {
            Application existing = app(11L, "Google", "Dev");
            when(applicationRepository.findByIdAndUserId(11L, TEST_USER_ID)).thenReturn(Optional.of(existing));
            when(applicationRepository.save(any(Application.class))).thenReturn(existing);

            StageUpdateRequest request = new StageUpdateRequest(
                    ApplicationStatus.REJECTED,
                    null,
                    RejectionReason.NO_RESPONSE,
                    "No feedback"
            );

            ApplicationResponse response = applicationService.updateStage(11L, request, TEST_USER_ID);

            verify(applicationRepository).save(appCaptor.capture());
            Application captured = appCaptor.getValue();
            assertEquals(ApplicationStatus.REJECTED, captured.getStatus());
            assertEquals(RejectionReason.NO_RESPONSE, captured.getRejectionReason());
            assertNull(captured.getCurrentStage());
            assertEquals(RejectionReason.NO_RESPONSE, response.rejectionReason());
        }

        @Test
        void updateStage_toWyslane_clearsFlowDataAndHistory() {
            Application existing = app(12L, "Google", "Dev");
            existing.setStatus(ApplicationStatus.REJECTED);
            existing.setCurrentStage("HR call");
            existing.setRejectionReason(RejectionReason.EMAIL_REJECTION);
            existing.setRejectionDetails("No fit");

            when(applicationRepository.findByIdAndUserId(12L, TEST_USER_ID)).thenReturn(Optional.of(existing));
            when(applicationRepository.save(any(Application.class))).thenReturn(existing);

            ApplicationResponse response = applicationService.updateStage(
                    12L,
                    new StageUpdateRequest(ApplicationStatus.SENT, null, null, null),
                    TEST_USER_ID
            );

            assertEquals(ApplicationStatus.SENT, response.status());
            assertNull(response.currentStage());
            assertNull(response.rejectionReason());
        }
    }

    @Nested
    class DeleteTests {

        @Test
        void delete_callsNoteCleanupAndDelete() {
            Application existing = app(1L, "Google", "Dev");
            when(applicationRepository.findByIdAndUserId(1L, TEST_USER_ID)).thenReturn(Optional.of(existing));

            applicationService.delete(1L, TEST_USER_ID);

            verify(noteService).deleteByApplicationId(1L, TEST_USER_ID);
            verify(applicationRepository).delete(existing);
        }

        @Test
        void delete_throwsWhenApplicationMissing() {
            when(applicationRepository.findByIdAndUserId(99L, TEST_USER_ID)).thenReturn(Optional.empty());

            EntityNotFoundException ex = assertThrows(
                    EntityNotFoundException.class,
                    () -> applicationService.delete(99L, TEST_USER_ID)
            );

            assertTrue(ex.getMessage().contains("99"));
            verify(applicationRepository, never()).delete(any());
        }
    }
}
