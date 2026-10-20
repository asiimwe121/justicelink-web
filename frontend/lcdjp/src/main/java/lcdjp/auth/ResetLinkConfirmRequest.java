package lcdjp.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetLinkConfirmRequest {

    @NotBlank(message = "Reset token is required")
    @Size(max = 200, message = "Reset token is invalid")
    private String token;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String newPassword;

    private String confirmPassword;
}
