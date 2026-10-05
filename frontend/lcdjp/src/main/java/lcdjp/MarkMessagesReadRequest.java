package lcdjp;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class MarkMessagesReadRequest {
    @Size(max = 255)
    private String username;
}
