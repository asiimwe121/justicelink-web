package lcdjp.ai;

import lcdjp.legal.LegalSourceReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

public class AiChatResponse {
    private String reply;
    private boolean fallback;

    private boolean legalRagUsed;

    private List<LegalSourceReference> sources = new java.util.ArrayList<>();

    public AiChatResponse() {}

    public AiChatResponse(String reply, boolean fallback) {
        this.reply = reply;
        this.fallback = fallback;
    }

    public static AiChatResponse of(String reply) {
        return new AiChatResponse(reply, false);
    }

    public static AiChatResponse fallback(String reply) {
        return new AiChatResponse(reply, true);
    }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
    public boolean isFallback() { return fallback; }
    public void setFallback(boolean fallback) { this.fallback = fallback; }
    public boolean isLegalRagUsed() { return legalRagUsed; }
    public void setLegalRagUsed(boolean legalRagUsed) { this.legalRagUsed = legalRagUsed; }
    public List<LegalSourceReference> getSources() { return sources; }
    public void setSources(List<LegalSourceReference> sources) { this.sources = sources; }
}
