package lcdjp.auth;

import lombok.Data;

@Data
public class PasswordResetConfirmRequest {
    private String token;
    private String newPassword;
    private String confirmPassword;
}