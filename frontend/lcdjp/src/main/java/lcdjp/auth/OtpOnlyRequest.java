package lcdjp.auth;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
@Data
public class OtpOnlyRequest {
    @NotBlank(message = "otp is required")
    @Pattern(regexp = "\\d{6}", message = "otp must be six digits")
    private String otp;
}
