package lcdjp.chat;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class ChatMessageRequest {
    @JsonAlias("from_name") private String fromName;
    @JsonAlias("from_role") private String fromRole;
    @JsonAlias("sent_to") private String sentTo;
    @Size(max = 20_000) private String message;
    private String type;
    @JsonAlias("audio_data") @Size(max = 4_000_000) private String audioData; // ~60s of voice is well under 1 MB; 20 MB invited abuse
    @Min(0) @Max(10_000) private Integer duration;
    private String reply;
    @JsonAlias("reply_timestamp") private String replyTimestamp;
    private String timestamp;
    @JsonAlias("is_read") private Boolean isRead;
    private Boolean delivered;
}
