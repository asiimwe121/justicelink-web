package lcdjp;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class LegalAlertCreateRequest {
    @NotBlank @Size(max = 500) private String title;
    @Size(max = 50_000) private String content;
    @Size(max = 100) private String category;
    @Size(max = 20) private String priority;
    @Size(max = 20) private String audience;
}
