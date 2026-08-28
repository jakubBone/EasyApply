package com.applikon.service.ai;

import java.util.List;

public final class BriefLocales {

    private BriefLocales() {}

    public static final List<String> FIELD_KEYS = List.of("pitch");

    // Mirrors the active i18n UI locales (today PL + EN)
    public static final List<String> LOCALES = List.of("pl", "en");
}
