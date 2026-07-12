package com.applikon.dto;

import java.util.List;

public record UserExportResponse(
        ProfileExport profile,
        List<ApplicationExport> applications,
        List<ScreeningAnswerExport> screeningAnswers,
        List<BriefFieldExport> briefFields
) {
    public record ProfileExport(
            String email,
            String name,
            String createdAt,
            String privacyPolicyAcceptedAt
    ) {}

    public record ApplicationExport(
            Long id,
            String company,
            String position,
            String link,
            Integer salary,
            Integer salaryMin,
            Integer salaryMax,
            String currency,
            String salaryType,
            String contractType,
            String salarySource,
            String source,
            String status,
            String jobDescription,
            String agency,
            String currentStage,
            String rejectionReason,
            String rejectionDetails,
            String appliedAt,
            CvExport cv,
            List<NoteExport> notes
    ) {}

    public record CvExport(
            String name,
            String type,
            String externalUrl
    ) {}

    public record NoteExport(
            String content,
            String category,
            String createdAt
    ) {}

    public record ScreeningAnswerExport(
            String questionKey,
            String label,
            String answer,
            boolean custom,
            int sortOrder
    ) {}

    // A brief field the user edited (user data). One per (company, field): every locale carries the
    // same user text. Generated, un-edited fields are derived public data and are not exported.
    public record BriefFieldExport(
            String company,
            String fieldKey,
            String text
    ) {}
}
