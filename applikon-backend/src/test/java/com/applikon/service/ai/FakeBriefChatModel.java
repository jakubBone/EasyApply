package com.applikon.service.ai;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Profile("test")
public class FakeBriefChatModel implements BriefChatModel {

    private static final String INSUFFICIENT_FIELD = "size_stage";

    private final AtomicInteger calls = new AtomicInteger();
    private volatile boolean failNext = false;

    @Override
    public GeneratedBrief generate(String companyName) {
        calls.incrementAndGet();
        if (failNext) {
            throw new IllegalStateException("Fake brief provider forced failure");
        }
        List<GeneratedBrief.Field> fields = new ArrayList<>();
        for (String key : BriefLocales.FIELD_KEYS) {
            for (String lang : BriefLocales.LOCALES) {
                String text = INSUFFICIENT_FIELD.equals(key) ? null : "[" + lang + "] " + key + " for " + companyName;
                fields.add(new GeneratedBrief.Field(key, lang, text));
            }
        }
        return new GeneratedBrief(fields);
    }

    public int callCount() {
        return calls.get();
    }

    public void setFailNext(boolean failNext) {
        this.failNext = failNext;
    }
}
