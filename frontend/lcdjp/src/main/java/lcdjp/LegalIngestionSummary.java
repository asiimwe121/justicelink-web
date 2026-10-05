package lcdjp;

import java.util.ArrayList;
import java.util.List;

public class LegalIngestionSummary {

    public int filesDiscovered;
    public int supportedFiles;
    public int processedFiles;
    public int skippedFiles;
    public int failedFiles;
    public int chunksCreated;
    public int embeddingsGenerated;
    public int vectorsStored;
    public int ocrRequired;

    public List<String> ocrRequiredFiles = new ArrayList<>();
    public List<FailureDetail> failures = new ArrayList<>();

    public static class FailureDetail {
        public String relativePath;
        public String reason;

        public FailureDetail(String relativePath, String reason) {
            this.relativePath = relativePath;
            this.reason = reason;
        }
    }
}
