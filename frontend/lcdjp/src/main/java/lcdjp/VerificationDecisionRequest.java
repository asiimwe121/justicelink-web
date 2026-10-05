package lcdjp;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class VerificationDecisionRequest {
    @NotBlank(message = "status is required")
    @Size(max = 30)
    private String status;
    @Size(max = 2000)
    private String reason;
}
