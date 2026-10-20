package lcdjp.lcinvite;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** What someone who says they are an LC sends to ask for a sign-up link: just an email and where they serve. */
@Data
public class LcInviteRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 320)
    private String email;

    /** The district decides which admin sees the request, so it is required even though the form is short. */
    @NotBlank(message = "District is required")
    @Size(max = 100)
    @Pattern(regexp = "^[\\p{L} .'-]+$", message = "Enter a valid district")
    private String district;
}
