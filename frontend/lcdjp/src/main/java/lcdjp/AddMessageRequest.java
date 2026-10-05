package lcdjp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddMessageRequest {

    @NotBlank(message = "text is required")
    @Size(max = 5000, message = "text must be 5000 characters or fewer")
    private String text;

    private Boolean read;
    private Boolean preAcceptance;

    private Object timestamp;
}
