package lcdjp.cases;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignHandlerRequest {

    @NotBlank(message = "currentHandler is required")
    private String currentHandler;

    @NotBlank(message = "handlerRole is required")
    private String handlerRole;

    private Object messagingEnabled;
    private Object messagingLocked;
}
