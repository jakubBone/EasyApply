package com.applikon.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Pure unit tests of the adapter's prompt/parse logic — the ChatModel is stubbed, no network.
class GeminiBriefChatModelTest {

    private static final String FULL_JSON = """
            {"industry": {"pl": "Fintech (pl)", "en": "Fintech (en)"},
             "product_customers": {"pl": "Payments (pl)", "en": "Payments (en)"},
             "tech_stack": {"pl": "Java", "en": "Java"},
             "size_stage": {"pl": null, "en": null}}
            """;

    @Test
    @DisplayName("parses a fenced JSON reply into one entry per field x locale")
    void parsesFencedJson() {
        GeneratedBrief brief = adapterReturning("```json\n" + FULL_JSON + "\n```").generate("Acme");

        assertEquals(BriefLocales.FIELD_KEYS.size() * BriefLocales.LOCALES.size(), brief.fields().size());
        assertEquals("Fintech (en)", textOf(brief, "industry", "en"));
        assertEquals("Fintech (pl)", textOf(brief, "industry", "pl"));
    }

    @Test
    @DisplayName("JSON null and blank strings become the insufficient-info marker (null text)")
    void nullAndBlankMeanInsufficient() {
        GeneratedBrief brief = adapterReturning(FULL_JSON.replace("\"Java\"", "\"  \"")).generate("Acme");

        assertNull(textOf(brief, "size_stage", "pl"));
        assertNull(textOf(brief, "size_stage", "en"));
        assertNull(textOf(brief, "tech_stack", "en"));
    }

    @Test
    @DisplayName("a reply missing one field x locale entry throws (worker turns it into FAILED)")
    void missingEntryThrows() {
        String missingEn = FULL_JSON.replace(", \"en\": \"Fintech (en)\"", "");

        assertThrows(IllegalStateException.class, () -> adapterReturning(missingEn).generate("Acme"));
    }

    @Test
    @DisplayName("a reply without a JSON object throws")
    void proseThrows() {
        assertThrows(IllegalStateException.class,
                () -> adapterReturning("I could not find anything about this company.").generate("Acme"));
    }

    @Test
    @DisplayName("prompt carries the company name and no URL")
    void promptCarriesNameOnly() {
        AtomicReference<Prompt> seen = new AtomicReference<>();
        ChatModel stub = prompt -> {
            seen.set(prompt);
            return response(FULL_JSON);
        };

        new GeminiBriefChatModel(stub, new ObjectMapper()).generate("Acme");

        String prompt = seen.get().getContents();
        assertTrue(prompt.contains("Acme"));
        // ADR-006: the company name is the only thing that reaches the provider
        assertFalse(prompt.contains("http"));
    }

    private GeminiBriefChatModel adapterReturning(String answer) {
        return new GeminiBriefChatModel(prompt -> response(answer), new ObjectMapper());
    }

    private static ChatResponse response(String answer) {
        return new ChatResponse(List.of(new Generation(new AssistantMessage(answer))));
    }

    private static String textOf(GeneratedBrief brief, String key, String lang) {
        return brief.fields().stream()
                .filter(f -> f.fieldKey().equals(key) && f.lang().equals(lang))
                .findFirst().orElseThrow().text();
    }
}
