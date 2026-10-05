package lcdjp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LegalAdviceRequest {

    @NotBlank(message = "legalAdvice is required")
    @Size(max = 10000, message = "legalAdvice must be 10000 characters or fewer")
    private String legalAdvice;
}
