package com.applikon.dto;

import jakarta.validation.Valid;

import java.util.List;

// Replace-all save for a user's "My answers" set
public record ScreeningAnswersRequest(
        @Valid List<ScreeningAnswerRequest> answers) {

    public List<ScreeningAnswerRequest> answers() {
        return answers == null ? List.of() : answers;
    }
}
