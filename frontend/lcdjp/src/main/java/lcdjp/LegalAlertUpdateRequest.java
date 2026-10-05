package lcdjp;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class LegalAlertUpdateRequest {
    @Size(max = 500) private String title;
    @Size(max = 50_000) private String content;
    @Size(max = 100) private String category;
    private Boolean isActive;
}
