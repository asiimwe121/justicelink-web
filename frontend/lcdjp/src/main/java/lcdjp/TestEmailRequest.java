package lcdjp;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class TestEmailRequest {
    @NotBlank(message = "email is required")
    @Email
    @Size(max = 320)
    private String email;
}
