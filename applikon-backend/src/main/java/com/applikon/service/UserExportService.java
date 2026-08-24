package com.applikon.service;

import com.applikon.dto.UserExportResponse;
import com.applikon.dto.UserExportResponse.*;
import com.applikon.entity.Application;
import com.applikon.entity.CV;
import com.applikon.entity.CompanyBrief;
import com.applikon.entity.CompanyBriefField;
import com.applikon.entity.Note;
import com.applikon.entity.ScreeningAnswer;
import com.applikon.entity.User;
import com.applikon.repository.ApplicationRepository;
import com.applikon.repository.CompanyBriefFieldRepository;
import com.applikon.repository.CompanyBriefRepository;
import com.applikon.repository.NoteRepository;
import com.applikon.repository.ScreeningAnswerRepository;
import com.applikon.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class UserExportService {

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final NoteRepository noteRepository;
    private final ScreeningAnswerRepository screeningAnswerRepository;
    private final CompanyBriefRepository briefRepository;
    private final CompanyBriefFieldRepository briefFieldRepository;

    public UserExportService(UserRepository userRepository,
                             ApplicationRepository applicationRepository,
                             NoteRepository noteRepository,
                             ScreeningAnswerRepository screeningAnswerRepository,
                             CompanyBriefRepository briefRepository,
                             CompanyBriefFieldRepository briefFieldRepository) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.noteRepository = noteRepository;
        this.screeningAnswerRepository = screeningAnswerRepository;
        this.briefRepository = briefRepository;
        this.briefFieldRepository = briefFieldRepository;
    }

    public UserExportResponse buildExport(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(EntityNotFoundException::new);

        List<Application> applications = applicationRepository.findByUserId(userId);

        List<ApplicationExport> appExports = applications.stream()
                .map(app -> {
                    List<Note> notes = noteRepository.findByApplicationIdOrderByCreatedAtDesc(app.getId());
                    return mapApplication(app, notes);
                })
                .toList();

        List<ScreeningAnswerExport> answerExports = screeningAnswerRepository
                .findByUserIdOrderBySortOrder(userId).stream()
                .map(this::mapScreeningAnswer)
                .toList();

        List<BriefFieldExport> briefFieldExports = briefRepository.findByUserId(userId).stream()
                .flatMap(brief -> mapEditedBriefFields(brief).stream())
                .toList();

        return new UserExportResponse(mapProfile(user), appExports, answerExports, briefFieldExports);
    }

    // Only the user's own edits leave in the export. All locales of an edited field carry the same
    // user text, so keep one entry per (company, field); generated text is derived public data.
    private List<BriefFieldExport> mapEditedBriefFields(CompanyBrief brief) {
        Map<String, CompanyBriefField> oneField = new LinkedHashMap<>();
        for (CompanyBriefField field : briefFieldRepository.findByBriefId(brief.getId())) {
            if (field.isEdited()) {
                oneField.putIfAbsent(field.getFieldKey(), field);
            }
        }
        return oneField.values().stream()
                .map(field -> new BriefFieldExport(brief.getCompanyName(), field.getFieldKey(), field.getText()))
                .toList();
    }

    private ScreeningAnswerExport mapScreeningAnswer(ScreeningAnswer answer) {
        return new ScreeningAnswerExport(
                answer.getQuestionKey(),
                answer.getLabel(),
                answer.getAnswer(),
                answer.isCustom(),
                answer.getSortOrder()
        );
    }

    private ProfileExport mapProfile(User user) {
        return new ProfileExport(
                user.getEmail(),
                user.getName(),
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
                user.getPrivacyPolicyAcceptedAt() != null ? user.getPrivacyPolicyAcceptedAt().toString() : null
        );
    }

    private ApplicationExport mapApplication(Application app, List<Note> notes) {
        CvExport cvExport = null;
        if (app.getCv() != null) {
            CV cv = app.getCv();
            cvExport = new CvExport(
                    cv.getOriginalFileName(),
                    cv.getType() != null ? cv.getType().name() : null,
                    cv.getExternalUrl()
            );
        }

        List<NoteExport> noteExports = notes.stream()
                .map(n -> new NoteExport(
                        n.getContent(),
                        n.getCategory() != null ? n.getCategory().name() : null,
                        n.getCreatedAt() != null ? n.getCreatedAt().toString() : null
                ))
                .toList();

        return new ApplicationExport(
                app.getId(),
                app.getCompany(),
                app.getPosition(),
                app.getLink(),
                app.getSalary(),
                app.getSalaryMin(),
                app.getSalaryMax(),
                app.getCurrency(),
                app.getSalaryType() != null ? app.getSalaryType().name() : null,
                app.getContractType() != null ? app.getContractType().name() : null,
                app.getSource(),
                app.getStatus() != null ? app.getStatus().name() : null,
                app.getJobDescription(),
                app.getCurrentStage(),
                app.getRejectionReason() != null ? app.getRejectionReason().name() : null,
                app.getRejectionDetails(),
                app.getAppliedAt() != null ? app.getAppliedAt().toString() : null,
                cvExport,
                noteExports
        );
    }
}
