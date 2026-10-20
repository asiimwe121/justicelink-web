package lcdjp.lcinvite;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Body for checking a sign-up link. */
@Data
public class LcInviteTokenRequest {
    @NotBlank(message = "Link token is required")
    @Size(max = 200, message = "Link token is invalid")
    private String token;
}
