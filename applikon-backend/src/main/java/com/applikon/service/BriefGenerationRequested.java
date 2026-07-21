package com.applikon.service;

// Request to generate a brief in the background. Published by BriefService.trigger inside its
// transaction; BriefGenerationWorker receives it only after that transaction commits.
// Carries the company name and nothing else — the brief is cached per (user, company), and the
// company name is all the provider is ever told (ADR-006).
public record BriefGenerationRequested(Long briefId, String companyName) {
}
