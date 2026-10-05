package lcdjp;

import lombok.Data;

@Data
public class PasswordResetRequest {
    private String username;
    private String email;
}