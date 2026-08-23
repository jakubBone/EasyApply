package com.applikon.service;

import com.applikon.dto.ApplicationRequest;
import com.applikon.dto.ApplicationResponse;
import com.applikon.dto.StageUpdateRequest;
import com.applikon.entity.*;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ApplicationService.class);

    private final ApplicationRepository applicationRepository;
    private final NoteService noteService;
    private final UserRepository userRepository;
    private final MessageSource messageSource;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            NoteService noteService,
            UserRepository userRepository,
            MessageSource messageSource) {
        this.applicationRepository = applicationRepository;
        this.noteService = noteService;
        this.userRepository = userRepository;
        this.messageSource = messageSource;
    }

    @Transactional
    public ApplicationResponse create(ApplicationRequest request, UUID userId) {
        log.info("Creating application for user={}, company={}", userId, request.company());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException(messageSource.getMessage("error.user.notFound", null, LocaleContextHolder.getLocale())));

        Application saved = applicationRepository.save(Application.from(request, user));

        return ApplicationResponse.fromEntity(getApplicationByIdAndUserId(saved.getId(), userId));
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> findAllByUserId(UUID userId) {
        return applicationRepository.findByUserId(userId).stream()
                .map(ApplicationResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationResponse findById(Long id, UUID userId) {
        return ApplicationResponse.fromEntity(getApplicationByIdAndUserId(id, userId));
    }

    @Transactional
    public ApplicationResponse updateStatus(Long id, ApplicationStatus status, UUID userId) {
        Application application = getApplicationByIdAndUserId(id, userId);
        application.setStatus(status);
        return ApplicationResponse.fromEntity(applicationRepository.save(application));
    }

    @Transactional
    public ApplicationResponse updateStage(Long id, StageUpdateRequest request, UUID userId) {
        Application application = getApplicationByIdAndUserId(id, userId);

        ApplicationStatus oldStatus = application.getStatus();
        ApplicationStatus newStatus = request.status();

        application.setStatus(newStatus);

        if (newStatus == ApplicationStatus.SENT) {
            // Rolling back to SENT resets the entire recruitment progress —
            // stages are no longer relevant as the process starts from scratch.
            application.setCurrentStage(null);
            application.setRejectionReason(null);
            application.setRejectionDetails(null);
        }

        if (newStatus == ApplicationStatus.IN_PROGRESS) {
            if (oldStatus == ApplicationStatus.OFFER || oldStatus == ApplicationStatus.REJECTED) {
                // Resuming the process after an offer or rejection (e.g. re-engagement) —
                // previous outcome data is no longer valid.
                application.setRejectionReason(null);
                application.setRejectionDetails(null);
            }
            if (request.currentStage() != null) {
                // Stage can be provided alongside the status change (e.g. "In progress — technical interview").
                application.setCurrentStage(request.currentStage());
            }
        }

        if (newStatus == ApplicationStatus.OFFER) {
            // An offer marks the end of the stage-based process — the active stage is no longer relevant.
            application.setCurrentStage(null);
            application.setRejectionReason(null);
            application.setRejectionDetails(null);
        }

        if (newStatus == ApplicationStatus.REJECTED) {
            // Rejection ends the process — we store the reason, but the recruitment stage is cleared.
            application.setCurrentStage(null);
            application.setRejectionReason(request.rejectionReason());
            application.setRejectionDetails(request.rejectionDetails());
        }

        return ApplicationResponse.fromEntity(applicationRepository.save(application));
    }

    @Transactional
    public ApplicationResponse addStage(Long id, String stageName, UUID userId) {
        Application application = getApplicationByIdAndUserId(id, userId);

        application.setCurrentStage(stageName);
        application.setStatus(ApplicationStatus.IN_PROGRESS);

        return ApplicationResponse.fromEntity(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> findDuplicates(UUID userId, String company, String position) {
        return applicationRepository
                .findByUserIdAndCompanyIgnoreCaseAndPositionIgnoreCase(userId, company, position).stream()
                .map(ApplicationResponse::fromEntity)
                .toList();
    }

    @Transactional
    public void delete(Long id, UUID userId) {
        Application application = getApplicationByIdAndUserId(id, userId);
        log.info("Deleting application id={} for user={}", id, userId);
        noteService.deleteByApplicationId(id, userId);
        applicationRepository.delete(application);
    }

    @Transactional
    public ApplicationResponse update(Long id, ApplicationRequest request, UUID userId) {
        Application application = getApplicationByIdAndUserId(id, userId);

        application.updateFrom(request);
        return ApplicationResponse.fromEntity(applicationRepository.save(application));
    }

    private Application getApplicationByIdAndUserId(Long id, UUID userId) {
        return applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new EntityNotFoundException(messageSource.getMessage("error.application.notFound", new Object[]{id}, LocaleContextHolder.getLocale())));
    }
}
