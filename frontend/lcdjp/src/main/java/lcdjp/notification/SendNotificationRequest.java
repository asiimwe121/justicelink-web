package lcdjp.notification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class SendNotificationRequest {
    @NotBlank @Size(max = 255) private String username;
    @NotBlank @Size(max = 10_000) private String message;
    @Size(max = 100) private String type;
}
