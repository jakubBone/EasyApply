package com.applikon.service.brief;

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
import com.applikon.service.ai.GeneratedBrief;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.MessageSource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BriefService tests")
class BriefServiceTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Long APP_ID = 1L;
    private static final Long BRIEF_ID = 7L;
    private static final String COMPANY = "Acme";

    @Mock private CompanyBriefRepository briefRepository;
    @Mock private CompanyBriefFieldRepository fieldRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private MessageSource messageSource;

    @InjectMocks private BriefService service;

    @Captor private ArgumentCaptor<List<CompanyBriefField>> savedFields;
    @Captor private ArgumentCaptor<BriefGenerationRequested> publishedEvent;

    @Test
    void trigger_returnsCachedBrief_withoutGenerating_whenReady() {
        givenOwnedApplication();
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY))
                .thenReturn(Optional.of(brief(BriefStatus.READY)));
        when(fieldRepository.findByBriefId(any())).thenReturn(List.of());

        BriefResponse response = service.trigger(USER_ID, APP_ID);

        assertEquals("READY", response.status());
        verify(briefRepository, never()).save(any());
        verifyNoInteractions(eventPublisher);
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
        verifyNoInteractions(eventPublisher);
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

        // The service only publishes the request; after-commit delivery is the listener's contract,
        // covered end-to-end in BriefControllerTest.
        verify(eventPublisher).publishEvent(publishedEvent.capture());
        assertEquals(COMPANY, publishedEvent.getValue().companyName());
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
        verify(eventPublisher).publishEvent(publishedEvent.capture());
        assertEquals(COMPANY, publishedEvent.getValue().companyName());
    }

    @Test
    void trigger_rejectsApplicationNotOwnedByUser() {
        when(applicationRepository.findByIdAndUserId(APP_ID, USER_ID)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.trigger(USER_ID, APP_ID));
        verify(briefRepository, never()).save(any());
        verifyNoInteractions(eventPublisher);
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

    @Test
    void markReady_replacesFields_andSetsReady() {
        CompanyBrief brief = brief(BriefStatus.PENDING);
        when(briefRepository.findById(BRIEF_ID)).thenReturn(Optional.of(brief));

        String key = BriefLocales.FIELD_KEYS.get(0);
        service.markReady(BRIEF_ID, new GeneratedBrief(List.of(
                new GeneratedBrief.Field(key, "pl", "text pl"),
                new GeneratedBrief.Field(key, "en", "   "))));     // blank = insufficient info

        verify(fieldRepository).deleteByBriefId(BRIEF_ID);
        verify(fieldRepository).saveAll(savedFields.capture());
        List<CompanyBriefField> saved = savedFields.getValue();
        assertEquals(2, saved.size());
        assertTrue(saved.stream().noneMatch(CompanyBriefField::isEdited));
        assertEquals("text pl", saved.get(0).getText());
        assertNull(saved.get(1).getText());                        // blank is stored as NULL, not ""
        assertEquals(BriefStatus.READY, brief.getStatus());
        verify(briefRepository).save(brief);
    }

    @Test
    void markReady_isNoOp_whenBriefIsGone() {
        when(briefRepository.findById(BRIEF_ID)).thenReturn(Optional.empty());

        String key = BriefLocales.FIELD_KEYS.get(0);
        service.markReady(BRIEF_ID, new GeneratedBrief(List.of(
                new GeneratedBrief.Field(key, "pl", "text pl"))));   // no throw: deleted mid-generation

        verify(fieldRepository, never()).deleteByBriefId(any());
        verify(fieldRepository, never()).saveAll(any());
        verify(briefRepository, never()).save(any());
    }

    @Test
    void delete_removesBrief_whenPresent() {
        givenOwnedApplication();
        CompanyBrief brief = brief(BriefStatus.READY);
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY)).thenReturn(Optional.of(brief));

        service.delete(USER_ID, APP_ID);

        verify(briefRepository).delete(brief);
    }

    @Test
    void delete_isNoOp_whenBriefIsMissing() {
        givenOwnedApplication();
        when(briefRepository.findByUserIdAndCompanyName(USER_ID, COMPANY)).thenReturn(Optional.empty());

        service.delete(USER_ID, APP_ID);                            // no throw

        verify(briefRepository, never()).delete(any());
    }

    @Test
    void delete_rejectsApplicationNotOwnedByUser() {
        when(applicationRepository.findByIdAndUserId(APP_ID, USER_ID)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.delete(USER_ID, APP_ID));
        verify(briefRepository, never()).delete(any());
    }

    @Test
    void markFailed_setsFailed() {
        CompanyBrief brief = brief(BriefStatus.PENDING);
        when(briefRepository.findById(BRIEF_ID)).thenReturn(Optional.of(brief));

        service.markFailed(BRIEF_ID);

        assertEquals(BriefStatus.FAILED, brief.getStatus());
        verify(briefRepository).save(brief);
    }

    @Test
    void markFailed_isSilent_whenBriefIsGone() {
        when(briefRepository.findById(BRIEF_ID)).thenReturn(Optional.empty());

        service.markFailed(BRIEF_ID);                              // no throw

        verify(briefRepository, never()).save(any());
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
}
