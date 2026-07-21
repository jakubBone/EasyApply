package com.applikon.service.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Groq adapter behind the BriefChatModel port - the active brief provider (ADR-005). Groq's
// compound system runs web search server side, replacing Gemini grounding after Google closed
// it to free-tier users (the fallback ADR-001 designated). Deliberately self-contained: prompt
// and parsing mirror GeminiBriefChatModel; consolidate only if a third provider ever appears.
@Component
@Profile("!test")
@ConditionalOnProperty(name = "brief.provider", havingValue = "groq")
public class GroqBriefChatModel implements BriefChatModel {

    // What each BriefLocales.FIELD_KEYS entry means, spelled out for the model
    private static final Map<String, String> FIELD_HINTS = Map.of(
            "industry", "the industry the company operates in",
            "product_customers", "what the company builds and who its customers are",
            "tech_stack", "the technologies the company works with",
            "size_stage", "company size and maturity stage (startup, scale-up, corporation)");

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    public GroqBriefChatModel(ChatModel chatModel, ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    @Override
    public GeneratedBrief generate(String companyName) {
        // No tool flag needed: compound decides server side when to search; the prompt's
        // explicit "search the web" instruction is what triggers it
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .temperature(0.2)
                .build();
        Generation result = chatModel.call(new Prompt(buildPrompt(companyName), options)).getResult();
        if (result == null || result.getOutput().getText() == null) {
            throw new IllegalStateException("Empty Groq response");
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
                You research companies for job applicants. Search the web for verifiable \
                public information about the company "%s".
                Reply with ONLY one JSON object, no prose and no markdown, exactly in this shape:
                %s
                Field meanings: %s.
                Rules:
                - each value is 1-2 concise sentences written in the language whose ISO 639-1 code is its key
                - use only verifiable public information
                - if there is not enough public information for a field, set it to null for EVERY language key — never guess
                """.formatted(companyName, schema, hints);
    }

    private GeneratedBrief parse(String answer) {
        JsonNode root;
        try {
            root = objectMapper.readTree(extractJsonObject(answer));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Groq response is not valid JSON", e);
        }
        List<GeneratedBrief.Field> fields = new ArrayList<>();
        for (String key : BriefLocales.FIELD_KEYS) {
            JsonNode byLang = root.get(key);
            if (byLang == null || !byLang.isObject()) {
                throw new IllegalStateException("Groq response lacks field " + key);
            }
            for (String lang : BriefLocales.LOCALES) {
                JsonNode value = byLang.get(lang);
                if (value == null || !(value.isNull() || value.isTextual())) {
                    throw new IllegalStateException("Groq response lacks entry " + key + "/" + lang);
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
            throw new IllegalStateException("Groq response contains no JSON object");
        }
        return answer.substring(start, end + 1);
    }
}
