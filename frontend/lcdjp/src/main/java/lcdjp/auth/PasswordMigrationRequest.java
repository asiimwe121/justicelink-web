package lcdjp.auth;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class PasswordMigrationRequest {
    @NotBlank(message = "username is required")
    @Size(max = 255)
    private String username;
    @NotBlank(message = "password is required")
    @Size(min = 8, max = 200)
    private String password;
}
