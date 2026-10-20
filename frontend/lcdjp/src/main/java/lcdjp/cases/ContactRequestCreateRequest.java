package lcdjp.cases;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class ContactRequestCreateRequest {
    @NotBlank @Size(max = 255) private String recipient;
    @NotBlank @Size(max = 2000) private String message;
}
