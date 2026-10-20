package lcdjp.auth;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class AccountCreationOtpRequest {
    @NotBlank(message = "purpose is required")
    @Size(max = 40)
    private String purpose;
    @Size(max = 320)
    private String email;
    @Size(max = 40)
    private String phone;
}
