package lcdjp.cases;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class ContactRequestDecisionRequest {
    @NotBlank @Size(max = 255) private String sender;
    @NotBlank @Size(max = 255) private String recipient;
}
