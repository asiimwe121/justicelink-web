package lcdjp;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoutingChoiceRequest {

    @NotBlank(message = "choice is required")
    private String choice;
}
