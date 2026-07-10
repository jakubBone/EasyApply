package com.applikon.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public record BriefEditRequest(List<Field> fields) {

    public List<Field> fields() {
        return fields == null ? List.of() : fields;
    }

    public record Field(
            String fieldKey,
            @Size(max = 4000, message = "{validation.brief.field.tooLong}") String text) {}
}
