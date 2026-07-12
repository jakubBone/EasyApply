package com.applikon.service.ai;

// Port to the AI provider that generates a brief. The domain depends only on this interface, so the
// live Gemini adapter and the FakeBriefChatModel (tests, local dev) are interchangeable.
// A provider error is thrown for the caller to turn into a FAILED brief.
public interface BriefChatModel {

    GeneratedBrief generate(String companyName, String jobAdLink);
}
