package lcdjp;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClassifyCaseRequest {

    @NotBlank(message = "description is required")
    private String description;

    private String district;
}
