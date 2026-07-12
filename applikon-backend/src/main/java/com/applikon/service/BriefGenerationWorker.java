package com.applikon.service;

import com.applikon.entity.BriefStatus;
import com.applikon.entity.CompanyBrief;
import com.applikon.entity.CompanyBriefField;
import com.applikon.repository.CompanyBriefFieldRepository;
import com.applikon.repository.CompanyBriefRepository;
import com.applikon.service.ai.BriefChatModel;
import com.applikon.service.ai.GeneratedBrief;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// Runs generation off the request thread. Kept separate from BriefService because @Async and
// @Transactional only work through the Spring proxy — calling a method on the same object runs inline,
// so the write steps go through self to keep their transaction. Only writes edited=false rows and never
// for a READY brief, so it can't overwrite a user edit.
@Service
public class BriefGenerationWorker {

    private final BriefChatModel briefChatModel;
    private final CompanyBriefRepository briefRepository;
    private final CompanyBriefFieldRepository fieldRepository;
    private final ObjectProvider<BriefGenerationWorker> self;

    public BriefGenerationWorker(BriefChatModel briefChatModel,
                                 CompanyBriefRepository briefRepository,
                                 CompanyBriefFieldRepository fieldRepository,
                                 ObjectProvider<BriefGenerationWorker> self) {
        this.briefChatModel = briefChatModel;
        this.briefRepository = briefRepository;
        this.fieldRepository = fieldRepository;
        this.self = self;
    }

    @Async("briefExecutor")
    public void generate(Long briefId, String companyName, String jobAdLink) {
        try {
            GeneratedBrief generated = briefChatModel.generate(companyName, jobAdLink);
            self.getObject().markReady(briefId, generated);
        } catch (Exception e) {
            self.getObject().markFailed(briefId);
        }
    }

    @Transactional
    public void markReady(Long briefId, GeneratedBrief generated) {
        CompanyBrief brief = briefRepository.findById(briefId).orElseThrow(EntityNotFoundException::new);
        fieldRepository.deleteByBriefId(briefId);
        List<CompanyBriefField> fields = new ArrayList<>();
        for (GeneratedBrief.Field entry : generated.fields()) {
            CompanyBriefField field = new CompanyBriefField();
            field.setBrief(brief);
            field.setFieldKey(entry.fieldKey());
            field.setLang(entry.lang());
            field.setText(blankToNull(entry.text()));
            field.setEdited(false);
            fields.add(field);
        }
        fieldRepository.saveAll(fields);
        brief.setStatus(BriefStatus.READY);
        briefRepository.save(brief);
    }

    @Transactional
    public void markFailed(Long briefId) {
        briefRepository.findById(briefId).ifPresent(brief -> {
            brief.setStatus(BriefStatus.FAILED);
            briefRepository.save(brief);
        });
    }

    private static String blankToNull(String text) {
        return (text == null || text.isBlank()) ? null : text;
    }
}
