package lcdjp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class LegalKnowledgeStartupRunner {

    private static final Logger log = LoggerFactory.getLogger(LegalKnowledgeStartupRunner.class);

    private final LegalKnowledgeIngestionService ingestionService;
    private final LegalKnowledgeProperties properties;

    public LegalKnowledgeStartupRunner(LegalKnowledgeIngestionService ingestionService,
                                        LegalKnowledgeProperties properties) {
        this.ingestionService = ingestionService;
        this.properties = properties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!properties.isAutoIngestOnStartup()) {
            log.info("Automatic legal-knowledge ingestion disabled (legal.knowledge.auto-ingest-on-startup=false)");
            return;
        }

        Thread ingestionThread = new Thread(this::runIngestionSafely, "legal-knowledge-startup-ingest");
        ingestionThread.setDaemon(true);
        ingestionThread.start();
    }

    private void runIngestionSafely() {
        log.info("Automatic legal-knowledge ingestion starting");
        try {
            LegalIngestionSummary summary = ingestionService.ingest();
            log.info("Automatic legal-knowledge ingestion finished: {} discovered, {} indexed, {} skipped " +
                            "(unchanged), {} requiring OCR, {} failed, {} chunks created",
                    summary.filesDiscovered, summary.processedFiles, summary.skippedFiles,
                    summary.ocrRequired, summary.failedFiles, summary.chunksCreated);
            if (summary.failedFiles > 0) {
                for (LegalIngestionSummary.FailureDetail failure : summary.failures) {
                    log.warn("Legal knowledge document failed to ingest: {} — {}", failure.relativePath, failure.reason);
                }
            }
        } catch (IllegalStateException e) {

            log.warn("Automatic legal-knowledge ingestion did not run: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Automatic legal-knowledge ingestion failed unexpectedly", e);
        }
    }
}
