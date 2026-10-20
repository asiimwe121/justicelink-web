package lcdjp.ai;

import lcdjp.legal.LegalSourceReference;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class AiIntakeResponse {
    private String intent = "OTHER";
    private Map<String, String> extracted = new LinkedHashMap<>();
    private String reply;
    private boolean fallback;
    private boolean legalRagUsed;
    private List<LegalSourceReference> sources = new ArrayList<>();

    static AiIntakeResponse fallback() {
        AiIntakeResponse r = new AiIntakeResponse();
        r.fallback = true;
        return r;
    }

    public String getIntent() { return intent; }
    public void setIntent(String intent) { this.intent = intent; }
    public Map<String, String> getExtracted() { return extracted; }
    public void setExtracted(Map<String, String> extracted) { this.extracted = extracted; }
    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
    public boolean isFallback() { return fallback; }
    public void setFallback(boolean fallback) { this.fallback = fallback; }
    public boolean isLegalRagUsed() { return legalRagUsed; }
    public void setLegalRagUsed(boolean legalRagUsed) { this.legalRagUsed = legalRagUsed; }
    public List<LegalSourceReference> getSources() { return sources; }
    public void setSources(List<LegalSourceReference> sources) { this.sources = sources; }
}
