package lcdjp.auth;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class RetiredRegistrationRequest {
    @NotBlank @Size(max = 255) private String username;
    @NotBlank @Size(min = 8, max = 200) private String password;
    private String firstName;
    private String lastName;
    private String userType;
    private String phoneNumber;
    private String email;
    private String district;
    private String subCounty;
    private String parish;
    private String village;
    private String nationalId;
    private String gender;
    private String dateOfBirth;
    @Size(max = 20) private String otp;
}
