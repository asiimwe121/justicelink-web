package lcdjp.auth;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class UsernameOtpRequest {
    @NotBlank(message = "username is required")
    @Size(max = 255)
    private String username;
    @Size(max = 20)
    private String otp;
}
