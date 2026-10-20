package lcdjp.notification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class NotificationCreateRequest {
    @NotBlank @Size(max = 255) private String username;
    @NotBlank @Size(max = 10_000) private String message;
    @Size(max = 100) private String type;
    @Size(max = 255) private String sender;
    @Size(max = 255) private String senderName;
    @Size(max = 100) private String senderRole;
    @Size(max = 255) private String district;
}
