package com.applikon.service.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Gemini adapter behind the BriefChatModel port (ADR-001): one Google-Search-grounded request
// asks for every field in every active locale. Only the company name and the job-ad link ever
// enter the prompt. Anything malformed or incomplete in the reply throws, which the worker turns
// into a terminal FAILED: a partial brief is never stored.
// Inactive since ADR-005 (brief.provider switch): Gemini grounding went paid-tier-only for new
// users, so Groq compound took over. Kept as the documented return path.
@Component
@Profile("!test")
@ConditionalOnProperty(name = "brief.provider", havingValue = "gemini", matchIfMissing = true)
public class GeminiBriefChatModel implements BriefChatModel {

    // What each BriefLocales.FIELD_KEYS entry means, spelled out for the model
    private static final Map<String, String> FIELD_HINTS = Map.of(
            "pitch", "the classic \"what do you know about our company\" interview answer: what "
                    + "it does, its product or service, its market, what sets it apart");

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    public GeminiBriefChatModel(ChatModel chatModel, ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    @Override
    public GeneratedBrief generate(String companyName) {
        GoogleGenAiChatOptions options = GoogleGenAiChatOptions.builder()
                .googleSearchRetrieval(true)
                .temperature(0.2)
                .build();
        Generation result = chatModel.call(new Prompt(buildPrompt(companyName), options)).getResult();
        if (result == null || result.getOutput().getText() == null) {
            throw new IllegalStateException("Empty Gemini response");
        }
        return parse(result.getOutput().getText());
    }

    private String buildPrompt(String companyName) {
        String langSchema = BriefLocales.LOCALES.stream()
                .map("\"%s\": string|null"::formatted)
                .collect(Collectors.joining(", "));
        String schema = BriefLocales.FIELD_KEYS.stream()
                .map(key -> "\"%s\": {%s}".formatted(key, langSchema))
                .collect(Collectors.joining(", ", "{", "}"));
        String hints = BriefLocales.FIELD_KEYS.stream()
                .map(key -> "%s = %s".formatted(key, FIELD_HINTS.getOrDefault(key, key)))
                .collect(Collectors.joining("; "));
        return """
                You research companies for job applicants preparing for a screening call. Using \
                Google Search, find verifiable public information about the company "%s".
                Reply with ONLY one JSON object, no prose and no markdown, exactly in this shape:
                %s
                Field meanings: %s.
                Rules:
                - write what the candidate would say out loud when asked "what do you know about \
                  the company", not a research summary
                - name something concrete: a product, market, technology, or recent move — generic \
                  filler that would fit any employer is a failed answer
                - do not cover why the candidate applied here; that is a different, personal question
                - each value is 1-2 concise sentences written in the language whose ISO 639-1 code is its key
                - use only verifiable public information
                - if there is not enough public information, set it to null for EVERY language key — never guess
                """.formatted(companyName, schema, hints);
    }

    private GeneratedBrief parse(String answer) {
        JsonNode root;
        try {
            root = objectMapper.readTree(extractJsonObject(answer));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Gemini response is not valid JSON", e);
        }
        List<GeneratedBrief.Field> fields = new ArrayList<>();
        for (String key : BriefLocales.FIELD_KEYS) {
            JsonNode byLang = root.get(key);
            if (byLang == null || !byLang.isObject()) {
                throw new IllegalStateException("Gemini response lacks field " + key);
            }
            for (String lang : BriefLocales.LOCALES) {
                JsonNode value = byLang.get(lang);
                if (value == null || !(value.isNull() || value.isTextual())) {
                    throw new IllegalStateException("Gemini response lacks entry " + key + "/" + lang);
                }
                String text = value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
                fields.add(new GeneratedBrief.Field(key, lang, text));
            }
        }
        return new GeneratedBrief(fields);
    }

    // Models often wrap JSON in a ```json fence or a sentence, so take the outermost {...}
    private String extractJsonObject(String answer) {
        int start = answer.indexOf('{');
        int end = answer.lastIndexOf('}');
        if (start < 0 || end < start) {
            throw new IllegalStateException("Gemini response contains no JSON object");
        }
        return answer.substring(start, end + 1);
    }
}
