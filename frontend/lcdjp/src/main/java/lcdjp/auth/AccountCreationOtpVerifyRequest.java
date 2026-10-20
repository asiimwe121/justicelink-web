package lcdjp.auth;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class AccountCreationOtpVerifyRequest {
    @NotBlank(message = "purpose is required")
    @Size(max = 40)
    private String purpose;
    @Size(max = 320)
    private String email;
    @Size(max = 40)
    private String phone;
    @NotBlank(message = "otp is required")
    @Pattern(regexp = "\\d{6}", message = "otp must be six digits")
    private String otp;
}
