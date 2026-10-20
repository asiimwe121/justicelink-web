package lcdjp.legal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LegalKnowledgeAdminControllerTest {

    @Mock private LegalKnowledgeIngestionService ingestionService;

    @InjectMocks
    private LegalKnowledgeAdminController controller;

    @Test
    void ingest_success_returnsSummary() throws Exception {
        LegalIngestionSummary summary = new LegalIngestionSummary();
        summary.filesDiscovered = 5;
        when(ingestionService.ingest()).thenReturn(summary);

        ResponseEntity<?> result = controller.ingest();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertSame(summary, result.getBody());
    }

    @Test
    void ingest_illegalState_returns400_withGenericMessage() throws Exception {
        when(ingestionService.ingest()).thenThrow(new IllegalStateException("already running"));

        ResponseEntity<?> result = controller.ingest();

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        assertEquals("Request could not be processed. Please try again later.",
                ((Map<?, ?>) result.getBody()).get("error"));
    }

    @Test
    void ingest_unexpectedException_returns500_withGenericMessage() throws Exception {
        when(ingestionService.ingest()).thenThrow(new RuntimeException("disk full"));

        ResponseEntity<?> result = controller.ingest();

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
        assertEquals("Ingestion failed. Please try again later.",
                ((Map<?, ?>) result.getBody()).get("error"));
    }
}
