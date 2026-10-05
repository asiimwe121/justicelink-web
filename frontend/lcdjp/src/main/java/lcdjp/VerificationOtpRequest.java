package lcdjp;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class VerificationOtpRequest {
    @NotBlank(message = "username is required")
    @Size(max = 255)
    private String username;
    @NotBlank(message = "otp is required")
    @Pattern(regexp = "\\d{6}", message = "otp must be six digits")
    private String otp;
}
