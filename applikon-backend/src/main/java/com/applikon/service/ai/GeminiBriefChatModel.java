package com.applikon.service.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Gemini adapter behind the BriefChatModel port (ADR-001): one Google-Search-grounded request
// asks for every field in every active locale. Only the company name and the job-ad link ever
// enter the prompt. Anything malformed or incomplete in the reply throws, which the worker turns
// into a terminal FAILED — a partial brief is never stored.
@Component
@Profile("!test")
public class GeminiBriefChatModel implements BriefChatModel {

    // What each BriefLocales.FIELD_KEYS entry means, spelled out for the model
    private static final Map<String, String> FIELD_HINTS = Map.of(
            "industry", "the industry the company operates in",
            "product_customers", "what the company builds and who its customers are",
            "tech_stack", "the technologies the company works with",
            "size_stage", "company size and maturity stage (startup, scale-up, corporation)");

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    public GeminiBriefChatModel(ChatModel chatModel, ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    @Override
    public GeneratedBrief generate(String companyName, String jobAdLink) {
        GoogleGenAiChatOptions options = GoogleGenAiChatOptions.builder()
                .googleSearchRetrieval(true)
                .temperature(0.2)
                .build();
        Generation result = chatModel.call(new Prompt(buildPrompt(companyName, jobAdLink), options)).getResult();
        if (result == null || result.getOutput().getText() == null) {
            throw new IllegalStateException("Empty Gemini response");
        }
        return parse(result.getOutput().getText());
    }

    private String buildPrompt(String companyName, String jobAdLink) {
        String langSchema = BriefLocales.LOCALES.stream()
                .map("\"%s\": string|null"::formatted)
                .collect(Collectors.joining(", "));
        String schema = BriefLocales.FIELD_KEYS.stream()
                .map(key -> "\"%s\": {%s}".formatted(key, langSchema))
                .collect(Collectors.joining(", ", "{", "}"));
        String hints = BriefLocales.FIELD_KEYS.stream()
                .map(key -> "%s = %s".formatted(key, FIELD_HINTS.getOrDefault(key, key)))
                .collect(Collectors.joining("; "));
        String linkHint = jobAdLink == null || jobAdLink.isBlank() ? ""
                : "Prioritize information from the job ad at %s when relevant.\n".formatted(jobAdLink);
        return """
                You research companies for job applicants. Using Google Search, find verifiable \
                public information about the company "%s".
                %sReply with ONLY one JSON object, no prose and no markdown, exactly in this shape:
                %s
                Field meanings: %s.
                Rules:
                - each value is 1-2 concise sentences written in the language whose ISO 639-1 code is its key
                - use only verifiable public information
                - if there is not enough public information for a field, set it to null for EVERY language key — never guess
                """.formatted(companyName, linkHint, schema, hints);
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

    // Models often wrap JSON in a ```json fence or a sentence — take the outermost {...}
    private String extractJsonObject(String answer) {
        int start = answer.indexOf('{');
        int end = answer.lastIndexOf('}');
        if (start < 0 || end < start) {
            throw new IllegalStateException("Gemini response contains no JSON object");
        }
        return answer.substring(start, end + 1);
    }
}
