package lcdjp.legal;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "legal.knowledge")
public class LegalKnowledgeProperties {

    private String dir;

    private int chunkSizeChars = 1800;
    private int chunkOverlapChars = 200;

    private boolean autoIngestOnStartup = true;

    public String getDir() { return dir; }
    public void setDir(String dir) { this.dir = dir; }
    public int getChunkSizeChars() { return chunkSizeChars; }
    public void setChunkSizeChars(int chunkSizeChars) { this.chunkSizeChars = chunkSizeChars; }
    public int getChunkOverlapChars() { return chunkOverlapChars; }
    public void setChunkOverlapChars(int chunkOverlapChars) { this.chunkOverlapChars = chunkOverlapChars; }
    public boolean isAutoIngestOnStartup() { return autoIngestOnStartup; }
    public void setAutoIngestOnStartup(boolean autoIngestOnStartup) { this.autoIngestOnStartup = autoIngestOnStartup; }
}
