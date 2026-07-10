package com.applikon.dto;

import java.util.Map;

// One brief field: text per active locale (lang -> text, null = "not enough public info") + edited flag.
public record BriefFieldResponse(String key, Map<String, String> texts, boolean edited) {}
