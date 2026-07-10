package com.applikon.service.ai;

import java.util.List;

/**
 * The provider's output: a flat list of entries, one per (field × language). A {@code null}
 * {@code text} means the provider had insufficient public info for that field in that language —
 * it is carried through verbatim and shown as an explicit marker, never dropped and never guessed.
 */
public record GeneratedBrief(List<Field> fields) {

    public record Field(String fieldKey, String lang, String text) {}
}
