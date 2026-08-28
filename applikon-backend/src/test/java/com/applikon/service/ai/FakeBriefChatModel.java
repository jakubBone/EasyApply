package com.applikon.service.ai;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Profile("test")
public class FakeBriefChatModel implements BriefChatModel {

    private final AtomicInteger calls = new AtomicInteger();
    private volatile boolean failNext = false;
    private volatile boolean insufficientNext = false;

    @Override
    public GeneratedBrief generate(String companyName) {
        calls.incrementAndGet();
        if (failNext) {
            throw new IllegalStateException("Fake brief provider forced failure");
        }
        boolean insufficient = insufficientNext;
        insufficientNext = false;
        List<GeneratedBrief.Field> fields = new ArrayList<>();
        for (String key : BriefLocales.FIELD_KEYS) {
            for (String lang : BriefLocales.LOCALES) {
                String text = insufficient ? null : "[" + lang + "] " + key + " for " + companyName;
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

    // One-shot: the next generate() returns the "not enough public info" marker (null text) for
    // every locale, then reverts to normal.
    public void setInsufficientNext(boolean insufficientNext) {
        this.insufficientNext = insufficientNext;
    }
}
