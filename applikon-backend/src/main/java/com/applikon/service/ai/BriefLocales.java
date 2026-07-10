package com.applikon.service.ai;

import java.util.List;

/**
 * The single source of truth for <em>what</em> a brief contains: its field keys and the set of
 * active UI locales. Both the prompt (Step 2) and the persistence iterate these lists, so adding
 * a language touches only {@link #LOCALES} — never the schema, the entity, or the query — and a
 * new field is a new entry in {@link #FIELD_KEYS}, never a migration.
 */
public final class BriefLocales {

    private BriefLocales() {}

    public static final List<String> FIELD_KEYS = List.of(
            "industry", "product_customers", "tech_stack", "size_stage");

    // Mirrors the active i18n UI locales (today PL + EN).
    public static final List<String> LOCALES = List.of("pl", "en");
}
