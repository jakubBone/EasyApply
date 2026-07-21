package com.applikon.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.model.SimpleApiKey;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

// The Groq counterpart of GeminiClientConfig, for the two things Spring AI's auto-configured
// OpenAI client cannot do. OpenAiChatAutoConfiguration declares openAiApi(..) and
// openAiChatModel(OpenAiApi, ..) as separate @ConditionalOnMissingBean beans, so supplying the
// api bean here makes it back off from building its own: its key assertion (via
// OpenAIAutoConfigurationUtil.resolveConnectionProperties) never runs, and a missing or rotated
// key fails the single generation call (terminal FAILED brief) instead of application startup.
// The chat model is still assembled by the auto-configuration, on top of this client.
// Second reason: a hard per-request timeout. The auto-configured RestClient inherits no read
// timeout, so a hung Groq call would pin a task-executor thread indefinitely and briefs would
// stop generating with no error. Timeout lives in client configuration only, never
// annotation-driven AOP (ADR-004).
@Configuration
@Profile("!test")
@ConditionalOnProperty(name = "brief.provider", havingValue = "groq")
public class GroqClientConfig {

    private static final Logger log = LoggerFactory.getLogger(GroqClientConfig.class);

    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int REQUEST_TIMEOUT_MS = 60_000;

    @Bean
    public OpenAiApi groqOpenAiApi(@Value("${spring.ai.openai.base-url}") String baseUrl,
                                   @Value("${spring.ai.openai.api-key:}") String apiKey) {
        // Length and 4-char format prefix only (gsk_) - the key itself must never reach the logs
        log.info("Groq client: api key {} ({} chars, prefix '{}'), connect timeout {} ms, request timeout {} ms",
                apiKey.isBlank() ? "MISSING" : "present", apiKey.length(),
                apiKey.substring(0, Math.min(4, apiKey.length())), CONNECT_TIMEOUT_MS, REQUEST_TIMEOUT_MS);

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        requestFactory.setReadTimeout(REQUEST_TIMEOUT_MS);

        // SimpleApiKey rather than the String overload: it carries a blank value unchallenged,
        // which is the whole point - the failure must happen on the call, not at startup
        return OpenAiApi.builder()
                .baseUrl(baseUrl)
                .apiKey(new SimpleApiKey(apiKey))
                .restClientBuilder(RestClient.builder().requestFactory(requestFactory))
                .build();
    }
}
