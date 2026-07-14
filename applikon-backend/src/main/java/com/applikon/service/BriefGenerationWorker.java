package com.applikon.service;

import com.applikon.service.ai.BriefChatModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// Runs generation off the request thread. Spring delivers the event only after the trigger
// transaction commits, so the background thread always finds the PENDING row. Persistence goes
// through BriefService, whose @Transactional methods give the writes their own transactions.
@Service
public class BriefGenerationWorker {

    private final BriefChatModel briefChatModel;
    private final BriefService briefService;
    private final TaskExecutor taskExecutor;

    // "applicationTaskExecutor" is Boot's general-purpose pool; the qualifier is needed because
    // @EnableScheduling's taskScheduler also implements TaskExecutor.
    public BriefGenerationWorker(BriefChatModel briefChatModel,
                                 BriefService briefService,
                                 @Qualifier("applicationTaskExecutor") TaskExecutor taskExecutor) {
        this.briefChatModel = briefChatModel;
        this.briefService = briefService;
        this.taskExecutor = taskExecutor;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(BriefGenerationRequested event) {
        taskExecutor.execute(() -> {
            try {
                briefService.markReady(event.briefId(),
                        briefChatModel.generate(event.companyName(), event.jobAdLink()));
            } catch (Exception e) {
                briefService.markFailed(event.briefId());
            }
        });
    }
}
