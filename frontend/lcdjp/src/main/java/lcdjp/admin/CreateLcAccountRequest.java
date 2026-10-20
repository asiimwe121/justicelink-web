package lcdjp.admin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class CreateLcAccountRequest {
    @NotBlank @Size(min = 8, max = 255) private String username;
    @NotBlank @Size(min = 8, max = 200) private String password;
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @Email @NotBlank private String email;
    @NotBlank private String phone;
    @NotBlank private String district;
    /** Which council this account represents: LC1 (village) up to LC5 (district). */
    @NotBlank(message = "LC level is required (LC1 to LC5)")
    @Pattern(regexp = "^(?i)LC[\\s-]?[1-5]$", message = "LC level must be one of LC1, LC2, LC3, LC4, LC5")
    private String lcLevel;
    private String village;
    private String parish;
    private String subCounty;
    private String createdBy;
    private String fallbackReason;
}
