package lcdjp;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class CreateDistrictAdminRequest {
    @NotBlank @Size(min = 8, max = 255) private String username;
    @NotBlank @Size(min = 8, max = 200) private String password;
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @Email @NotBlank private String email;
    @NotBlank private String phone;
    @NotBlank private String district;
}
