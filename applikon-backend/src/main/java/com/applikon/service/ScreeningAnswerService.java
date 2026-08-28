package com.applikon.service;

import com.applikon.dto.ScreeningAnswerRequest;
import com.applikon.dto.ScreeningAnswerResponse;
import com.applikon.entity.Application;
import com.applikon.entity.ScreeningAnswer;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.ScreeningAnswerRepository;
import com.applikon.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Screening answers live in two scopes: the user's global "My answers" template
// (application_id IS NULL) and a per-application "About the company" set.
// Saving is a replace-all upsert inside one scope: the existing rows go, the incoming set
// lands. At a handful of rows that is the simplest thing that stays correct under debounced
// autosave, where a diff would have to reconcile reorders and deletes, and it cannot disturb
// the other scope's rows.
@Service
public class ScreeningAnswerService {

    private final ScreeningAnswerRepository screeningAnswerRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final MessageSource messageSource;

    public ScreeningAnswerService(ScreeningAnswerRepository screeningAnswerRepository,
                                  UserRepository userRepository,
                                  ApplicationRepository applicationRepository,
                                  MessageSource messageSource) {
        this.screeningAnswerRepository = screeningAnswerRepository;
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.messageSource = messageSource;
    }

    @Transactional(readOnly = true)
    public List<ScreeningAnswerResponse> findByUser(UUID userId) {
        return screeningAnswerRepository.findByUserIdAndApplicationIdIsNullOrderBySortOrder(userId).stream()
                .map(ScreeningAnswerResponse::fromEntity)
                .toList();
    }

    @Transactional
    public List<ScreeningAnswerResponse> save(UUID userId, List<ScreeningAnswerRequest> requests) {
        User userRef = userRepository.getReferenceById(userId);
        screeningAnswerRepository.deleteByUserIdAndApplicationIdIsNull(userId);
        return persist(userRef, null, requests);
    }

    @Transactional(readOnly = true)
    public List<ScreeningAnswerResponse> findByUserAndApplication(UUID userId, Long applicationId) {
        requireOwnedApplication(applicationId, userId);
        return screeningAnswerRepository.findByUserIdAndApplicationIdOrderBySortOrder(userId, applicationId).stream()
                .map(ScreeningAnswerResponse::fromEntity)
                .toList();
    }

    @Transactional
    public List<ScreeningAnswerResponse> saveForApplication(UUID userId, Long applicationId, List<ScreeningAnswerRequest> requests) {
        requireOwnedApplication(applicationId, userId);
        User userRef = userRepository.getReferenceById(userId);
        Application applicationRef = applicationRepository.getReferenceById(applicationId);
        screeningAnswerRepository.deleteByUserIdAndApplicationId(userId, applicationId);
        return persist(userRef, applicationRef, requests);
    }

    private List<ScreeningAnswerResponse> persist(User userRef, Application application, List<ScreeningAnswerRequest> requests) {
        List<ScreeningAnswer> toSave = new ArrayList<>();
        int order = 0;
        for (ScreeningAnswerRequest request : requests) {
            // Custom questions with an empty label are dropped (US-1, edge case).
            if (request.custom() && (request.label() == null || request.label().isBlank())) {
                continue;
            }
            ScreeningAnswer entity = new ScreeningAnswer();
            entity.setUser(userRef);
            entity.setApplication(application);
            entity.setQuestionKey(request.questionKey());
            entity.setLabel(request.label());
            entity.setAnswer(request.answer());
            entity.setCustom(request.custom());
            entity.setSortOrder(order++);
            toSave.add(entity);
        }

        return screeningAnswerRepository.saveAll(toSave).stream()
                .map(ScreeningAnswerResponse::fromEntity)
                .toList();
    }

    private void requireOwnedApplication(Long applicationId, UUID userId) {
        if (!applicationRepository.existsByIdAndUserId(applicationId, userId)) {
            throw new EntityNotFoundException(messageSource.getMessage(
                    "error.application.notFound", new Object[]{applicationId}, LocaleContextHolder.getLocale()));
        }
    }
}
