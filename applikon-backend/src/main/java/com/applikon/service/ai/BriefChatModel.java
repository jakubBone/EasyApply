package com.applikon.service.ai;

/**
 * Port to the AI provider that generates a company brief (Ports &amp; Adapters). The domain depends
 * only on this interface; the live Gemini adapter (Step 2) and the {@link FakeBriefChatModel} used
 * in tests and local dev are interchangeable. Only the company name and job-ad link ever cross this
 * boundary. An entry with {@code null} text means "insufficient public info"; any provider error is
 * thrown, and the caller turns it into a terminal FAILED.
 */
public interface BriefChatModel {

    GeneratedBrief generate(String companyName, String jobAdLink);
}
