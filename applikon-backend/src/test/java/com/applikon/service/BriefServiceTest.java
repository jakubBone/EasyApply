package com.applikon.service;

import com.applikon.dto.BriefEditRequest;
import com.applikon.dto.BriefResponse;
import com.applikon.entity.Application;
import com.applikon.entity.BriefStatus;
import com.applikon.entity.CompanyBrief;
import com.applikon.entity.CompanyBriefField;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CompanyBriefFieldRepository;
import com.applikon.repository.CompanyBriefRepository;
import com.applikon.repository.UserRepository;
import com.applikon.service.ai.BriefLocales;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BriefService tests")
class BriefServiceTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Long APP_ID = 1L;
    private static final String COMPANY = "Acme";

    @Mock private CompanyBriefRepository briefRepository;
    @Mock private CompanyBriefFieldRepository fieldRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private BriefGenerationWorker worker;
    @Mock private MessageSource messageSource;

    @InjectMocks private BriefService service;

    @Captor private ArgumentCaptor<List<CompanyBriefField>> savedFields;

    @BeforeEach
    void setUp() {
        // trigger() registers an afterCommit synchronization; a real one must be active in the test.
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    @Test
    void trigger_returnsCachedBrief_withoutGenerating_whenReady() {
        givenOwnedApplication();
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY))
                .thenReturn(Optional.of(brief(BriefStatus.READY)));
        when(fieldRepository.findByBriefId(any())).thenReturn(List.of());

        BriefResponse response = service.trigger(USER_ID, APP_ID);

        assertEquals("READY", response.status());
        verify(briefRepository, never()).save(any());
        verify(worker, never()).generate(any(), any(), any());
    }

    @Test
    void trigger_isNoOp_whenAlreadyPending() {
        givenOwnedApplication();
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY))
                .thenReturn(Optional.of(brief(BriefStatus.PENDING)));
        when(fieldRepository.findByBriefId(any())).thenReturn(List.of());

        BriefResponse response = service.trigger(USER_ID, APP_ID);

        assertEquals("PENDING", response.status());
        verify(briefRepository, never()).save(any());
        verify(worker, never()).generate(any(), any(), any());
    }

    @Test
    void trigger_createsPendingBrief_andSchedulesGeneration_whenMissing() {
        givenOwnedApplication();
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY)).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(USER_ID)).thenReturn(new User("t@e.com", "T", "g"));
        when(briefRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(fieldRepository.findByBriefId(any())).thenReturn(List.of());

        BriefResponse response = service.trigger(USER_ID, APP_ID);

        assertEquals("PENDING", response.status());
        ArgumentCaptor<CompanyBrief> saved = ArgumentCaptor.forClass(CompanyBrief.class);
        verify(briefRepository).save(saved.capture());
        assertEquals(BriefStatus.PENDING, saved.getValue().getStatus());

        // Generation is scheduled only after the transaction commits.
        verify(worker, never()).generate(any(), any(), any());
        fireAfterCommit();
        verify(worker).generate(any(), eq(COMPANY), eq("http://job"));
    }

    @Test
    void trigger_retriesFromFailed() {
        givenOwnedApplication();
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY))
                .thenReturn(Optional.of(brief(BriefStatus.FAILED)));
        when(briefRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(fieldRepository.findByBriefId(any())).thenReturn(List.of());

        service.trigger(USER_ID, APP_ID);

        ArgumentCaptor<CompanyBrief> saved = ArgumentCaptor.forClass(CompanyBrief.class);
        verify(briefRepository).save(saved.capture());
        assertEquals(BriefStatus.PENDING, saved.getValue().getStatus());
        fireAfterCommit();
        verify(worker).generate(any(), eq(COMPANY), eq("http://job"));
    }

    @Test
    void trigger_rejectsApplicationNotOwnedByUser() {
        when(applicationRepository.findByIdAndUserId(APP_ID, USER_ID)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.trigger(USER_ID, APP_ID));
        verify(briefRepository, never()).save(any());
    }

    @Test
    void editFields_writesUserTextToEveryLocale_andMarksEdited() {
        givenOwnedApplication();
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY))
                .thenReturn(Optional.of(brief(BriefStatus.READY)));
        when(fieldRepository.findByBriefId(any())).thenReturn(List.of());

        String key = BriefLocales.FIELD_KEYS.get(0);
        service.editFields(USER_ID, APP_ID, new BriefEditRequest(
                List.of(new BriefEditRequest.Field(key, "My own text"))));

        verify(fieldRepository).saveAll(savedFields.capture());
        List<CompanyBriefField> saved = savedFields.getValue();
        assertEquals(BriefLocales.LOCALES.size(), saved.size());   // one row per locale
        assertTrue(saved.stream().allMatch(f -> f.isEdited() && "My own text".equals(f.getText())));
    }

    private void givenOwnedApplication() {
        Application application = new Application();
        application.setCompany(COMPANY);
        application.setLink("http://job");
        when(applicationRepository.findByIdAndUserId(APP_ID, USER_ID)).thenReturn(Optional.of(application));
    }

    private CompanyBrief brief(BriefStatus status) {
        CompanyBrief brief = new CompanyBrief();
        brief.setStatus(status);
        return brief;
    }

    private void fireAfterCommit() {
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
    }
}
