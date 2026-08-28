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
            // Rolling back to SENT restarts the process from scratch, so no stage or
            // outcome from the previous run survives.
            application.setCurrentStage(null);
            application.setRejectionReason(null);
            application.setRejectionDetails(null);
        }

        if (newStatus == ApplicationStatus.IN_PROGRESS) {
            if (oldStatus == ApplicationStatus.OFFER || oldStatus == ApplicationStatus.REJECTED) {
                // Re-engagement after a closed process. The old outcome no longer describes
                // where this application stands.
                application.setRejectionReason(null);
                application.setRejectionDetails(null);
            }
            if (request.currentStage() != null) {
                // A status change may carry the stage with it, e.g. "In progress (technical interview)".
                application.setCurrentStage(request.currentStage());
            }
        }

        if (newStatus == ApplicationStatus.OFFER) {
            // An offer ends the stage-based process, so the active stage stops meaning anything.
            application.setCurrentStage(null);
            application.setRejectionReason(null);
            application.setRejectionDetails(null);
        }

        if (newStatus == ApplicationStatus.REJECTED) {
            // Rejection ends the process. The reason is worth keeping, the stage is not.
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
