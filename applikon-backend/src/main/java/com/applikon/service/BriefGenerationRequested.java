package com.applikon.service;

// Request to generate a brief in the background. Published by BriefService.trigger inside its
// transaction; BriefGenerationWorker receives it only after that transaction commits.
public record BriefGenerationRequested(Long briefId, String companyName, String jobAdLink) {
}
