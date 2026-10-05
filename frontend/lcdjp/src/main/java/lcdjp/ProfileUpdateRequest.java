package lcdjp;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

@Data
public class ProfileUpdateRequest {
    private String firstName;
    private String lastName;
    @Email @Size(max = 320)
    private String email;
    private String phone;
    private String district;
    private String subCounty;
    private String parish;
    private String village;
    private String nationalId;
    private String gender;
    private String dateOfBirth;
    @Size(max = 20_000_000)
    private String avatarData;

    public boolean containsKey(String name) {
        return get(name) != null;
    }

    public Object get(String name) {
        return switch (name) {
            case "phone" -> phone;
            case "email" -> email;
            case "district" -> district;
            case "subCounty" -> subCounty;
            case "parish" -> parish;
            case "village" -> village;
            case "avatarData" -> avatarData;
            default -> null;
        };
    }
}
