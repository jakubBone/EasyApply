package com.applikon.config;

import com.google.genai.Client;
import com.google.genai.types.HttpOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

// Replaces Spring AI's auto-configured Gemini client (it is @ConditionalOnMissingBean) for two
// things it cannot do: a hard per-request HTTP timeout (the SDK default is unbounded, which would
// pin a task-executor thread on a hung call), and tolerating a blank key at startup: a missing
// or revoked key then fails the single generation call (terminal FAILED brief), never boot.
// Timeout and retry live in client configuration only, never annotation-driven AOP (ADR-004).
// Gated on the same switch as GeminiBriefChatModel (ADR-005): while Groq is the active provider
// no Gemini client is built, the key is not read, and the startup key log stays silent.
@Configuration
@Profile("!test")
@ConditionalOnProperty(name = "brief.provider", havingValue = "gemini", matchIfMissing = true)
public class GeminiClientConfig {

    private static final Logger log = LoggerFactory.getLogger(GeminiClientConfig.class);

    private static final int REQUEST_TIMEOUT_MS = 60_000;

    @Bean
    public Client googleGenAiClient(@Value("${spring.ai.google.genai.api-key:}") String apiKey) {
        // Length and 4-char format prefix only (AIza/AQ.A): the key itself must never reach the logs
        log.info("Gemini client: api key {} ({} chars, prefix '{}'), request timeout {} ms",
                apiKey.isBlank() ? "MISSING" : "present", apiKey.length(),
                apiKey.substring(0, Math.min(4, apiKey.length())), REQUEST_TIMEOUT_MS);
        return Client.builder()
                .apiKey(apiKey)
                .httpOptions(HttpOptions.builder().timeout(REQUEST_TIMEOUT_MS).build())
                .build();
    }
}
