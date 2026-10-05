package lcdjp;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShareDocumentRequest {
    @NotBlank(message = "sharedWith is required")
    private String sharedWith;
}
