package com.applikon.service;

import com.applikon.dto.BriefEditRequest;
import com.applikon.dto.BriefFieldResponse;
import com.applikon.dto.BriefResponse;
import com.applikon.entity.Application;
import com.applikon.entity.BriefStatus;
import com.applikon.entity.CompanyBrief;
import com.applikon.entity.CompanyBriefField;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CompanyBriefFieldRepository;
import com.applikon.repository.CompanyBriefRepository;
import com.applikon.repository.UserRepository;
import com.applikon.service.ai.BriefLocales;
import com.applikon.service.ai.GeneratedBrief;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Cache-aside briefs, keys (user, company). Triggering is idempotent: a PENDING or READY brief is
// never regenerated, only a FAILED one retries. Generation runs in the background; an edit is saved to
// every locale of the shared brief, so a correction shows on every application to that company.
@Service
public class BriefService {

    private final CompanyBriefRepository briefRepository;
    private final CompanyBriefFieldRepository fieldRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MessageSource messageSource;

    public BriefService(CompanyBriefRepository briefRepository,
                        CompanyBriefFieldRepository fieldRepository,
                        ApplicationRepository applicationRepository,
                        UserRepository userRepository,
                        ApplicationEventPublisher eventPublisher,
                        MessageSource messageSource) {
        this.briefRepository = briefRepository;
        this.fieldRepository = fieldRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.messageSource = messageSource;
    }

    @Transactional
    public BriefResponse trigger(UUID userId, Long applicationId) {
        Application application = requireOwnedApplication(applicationId, userId);
        String company = application.getCompany();

        CompanyBrief brief = briefRepository.findByUserIdAndCompanyName(userId, company).orElse(null);
        if (brief != null && brief.getStatus() != BriefStatus.FAILED) {
            return buildResponse(brief);                 // READY = cache hit; PENDING = already generating
        }
        if (brief == null) {
            brief = new CompanyBrief();
            brief.setUser(userRepository.getReferenceById(userId));
            brief.setCompanyName(company);
        }
        brief.setStatus(BriefStatus.PENDING);            // fresh or retry-from-FAILED
        brief = briefRepository.save(brief);
        eventPublisher.publishEvent(new BriefGenerationRequested(brief.getId(), company, application.getLink()));
        return buildResponse(brief);
    }

    @Transactional(readOnly = true)
    public BriefResponse get(UUID userId, Long applicationId) {
        Application application = requireOwnedApplication(applicationId, userId);
        CompanyBrief brief = briefRepository.findByUserIdAndCompanyName(userId, application.getCompany())
                .orElseThrow(() -> briefNotFound(applicationId));
        return buildResponse(brief);
    }

    @Transactional
    public void editFields(UUID userId, Long applicationId, BriefEditRequest request) {
        Application application = requireOwnedApplication(applicationId, userId);
        CompanyBrief brief = briefRepository.findByUserIdAndCompanyName(userId, application.getCompany())
                .orElseThrow(() -> briefNotFound(applicationId));

        List<CompanyBriefField> existing = fieldRepository.findByBriefId(brief.getId());
        List<CompanyBriefField> toSave = new ArrayList<>();
        for (BriefEditRequest.Field edit : request.fields()) {
            if (!BriefLocales.FIELD_KEYS.contains(edit.fieldKey())) {
                continue;                                // ignore unknown field keys
            }
            for (String lang : BriefLocales.LOCALES) {   // one user text shows in every language
                CompanyBriefField field = existing.stream()
                        .filter(f -> f.getFieldKey().equals(edit.fieldKey()) && f.getLang().equals(lang))
                        .findFirst()
                        .orElseGet(() -> newField(brief, edit.fieldKey(), lang));
                field.setText(edit.text());
                field.setEdited(true);
                toSave.add(field);
            }
        }
        fieldRepository.saveAll(toSave);
    }

    // Called from the background thread; replaces the brief's rows in one transaction, so a brief is
    // never visible half-written. Only writes edited=false rows and never runs for a READY brief,
    // so it cannot overwrite a user edit.
    @Transactional
    public void markReady(Long briefId, GeneratedBrief generated) {
        CompanyBrief brief = briefRepository.findById(briefId).orElseThrow(EntityNotFoundException::new);
        fieldRepository.deleteByBriefId(briefId);
        List<CompanyBriefField> fields = new ArrayList<>();
        for (GeneratedBrief.Field entry : generated.fields()) {
            CompanyBriefField field = newField(brief, entry.fieldKey(), entry.lang());
            field.setText(blankToNull(entry.text()));
            field.setEdited(false);
            fields.add(field);
        }
        fieldRepository.saveAll(fields);
        brief.setStatus(BriefStatus.READY);
        briefRepository.save(brief);
    }

    @Transactional
    public void markFailed(Long briefId) {
        briefRepository.findById(briefId).ifPresent(brief -> {
            brief.setStatus(BriefStatus.FAILED);
            briefRepository.save(brief);
        });
    }

    private static String blankToNull(String text) {
        return (text == null || text.isBlank()) ? null : text;
    }

    private CompanyBriefField newField(CompanyBrief brief, String fieldKey, String lang) {
        CompanyBriefField field = new CompanyBriefField();
        field.setBrief(brief);
        field.setFieldKey(fieldKey);
        field.setLang(lang);
        return field;
    }

    private BriefResponse buildResponse(CompanyBrief brief) {
        List<CompanyBriefField> rows = fieldRepository.findByBriefId(brief.getId());
        List<BriefFieldResponse> fields = new ArrayList<>();
        for (String key : BriefLocales.FIELD_KEYS) {
            Map<String, String> texts = new LinkedHashMap<>();
            boolean edited = false;
            for (CompanyBriefField row : rows) {
                if (row.getFieldKey().equals(key)) {
                    texts.put(row.getLang(), row.getText());
                    edited = edited || row.isEdited();
                }
            }
            fields.add(new BriefFieldResponse(key, texts, edited));
        }
        return new BriefResponse(brief.getStatus().name(), fields);
    }

    private Application requireOwnedApplication(Long applicationId, UUID userId) {
        return applicationRepository.findByIdAndUserId(applicationId, userId)
                .orElseThrow(() -> new EntityNotFoundException(messageSource.getMessage(
                        "error.application.notFound", new Object[]{applicationId}, LocaleContextHolder.getLocale())));
    }

    private EntityNotFoundException briefNotFound(Long applicationId) {
        return new EntityNotFoundException(messageSource.getMessage(
                "error.brief.notFound", new Object[]{applicationId}, LocaleContextHolder.getLocale()));
    }
}
