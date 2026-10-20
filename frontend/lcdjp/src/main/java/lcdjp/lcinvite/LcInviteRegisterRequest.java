package lcdjp.lcinvite;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * The sign-up form behind an invite link. It is the admin's "Create LC Account" form minus what the link
 * already settles: email and district come from the invite, and the person picks their own password
 * instead of getting a temporary one.
 */
@Data
public class LcInviteRegisterRequest {
    @NotBlank @Size(max = 200) private String token;
    @NotBlank @Size(min = 8, max = 255) private String username;
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @NotBlank private String phone;
    @NotBlank private String lcLevel;
    private String village;
    private String parish;
    private String subCounty;
    @NotBlank @Size(min = 8, max = 200) private String password;
    private String confirmPassword;
    private boolean acceptedTerms;
}
