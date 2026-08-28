package com.applikon.dto;

import jakarta.validation.constraints.Size;

// One answer in a save request. Order comes from the position in the list, not a client-sent
// sortOrder, so a reordered list cannot arrive with stale or colliding indexes.
public record ScreeningAnswerRequest(
        String questionKey,
        String label,
        @Size(max = 1000, message = "{validation.screeningAnswer.answer.tooLong}") String answer,
        boolean custom) {}
