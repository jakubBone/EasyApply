package com.applikon.service.ai;

import java.util.List;

// The provider's output: one entry per (field × language). text = null means the provider had
// no public info for that field — carried through as-is and shown as a marker, never guessed.
public record GeneratedBrief(List<Field> fields) {

    public record Field(String fieldKey, String lang, String text) {}
}
