package lcdjp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/legal-knowledge")
public class LegalKnowledgeAdminController {

    private static final Logger log = LoggerFactory.getLogger(LegalKnowledgeAdminController.class);

    private final LegalKnowledgeIngestionService ingestionService;

    public LegalKnowledgeAdminController(LegalKnowledgeIngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/ingest")
    public ResponseEntity<?> ingest() {
        try {
            LegalIngestionSummary summary = ingestionService.ingest();
            return ResponseEntity.ok(summary);
        } catch (IllegalStateException e) {

            log.warn("Legal ingestion could not start: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        } catch (Exception e) {
            log.error("Legal ingestion failed unexpectedly: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", "Ingestion failed. Please try again later."));
        }
    }
}
