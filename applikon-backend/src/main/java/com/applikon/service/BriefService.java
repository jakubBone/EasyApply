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
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private final BriefGenerationWorker worker;
    private final MessageSource messageSource;

    public BriefService(CompanyBriefRepository briefRepository,
                        CompanyBriefFieldRepository fieldRepository,
                        ApplicationRepository applicationRepository,
                        UserRepository userRepository,
                        BriefGenerationWorker worker,
                        MessageSource messageSource) {
        this.briefRepository = briefRepository;
        this.fieldRepository = fieldRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.worker = worker;
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
        generateAfterCommit(brief.getId(), company, application.getLink());
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

    // Fire generation only oted, so the background worker can read it.
    private void generateAfterCommit(Long briefId, String company, String jobAdLink) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                worker.generate(briefId, company, jobAdLink);
            }
        });
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
