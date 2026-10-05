package lcdjp;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class AdminUserUpdateRequest {
    private String firstName;
    private String lastName;
    @Size(max = 40) private String phone;
    @Email @Size(max = 320) private String email;
    private String district;
    private String subCounty;
    private String parish;
    private String village;
    private String nationalId;
    private String gender;
    private String dateOfBirth;
    private String approvalStatus;
    private String userType;
    private String lawyerSpecialization;
    private String lawFirmName;
    private String lawSchool;
    @PositiveOrZero private Integer yearsExperience;
    private String barNumber;
    private String lcLevel;
    private String lcPosition;
    private String organizationName;
    private String organizationType;
    private String specialization;
    private String nextOfKinName;
    private String nextOfKinPhone;
    @Email private String nextOfKinEmail;
    private String nextOfKinRelationship;
    @Size(max = 20_000_000) private String avatarData;

    public boolean containsKey(String name) {
        return get(name) != null;
    }

    public Object get(String name) {
        return switch (name) {
            case "firstName" -> firstName;
            case "lastName" -> lastName;
            case "phone" -> phone;
            case "email" -> email;
            case "district" -> district;
            case "subCounty" -> subCounty;
            case "parish" -> parish;
            case "village" -> village;
            case "nationalId" -> nationalId;
            case "gender" -> gender;
            case "dateOfBirth" -> dateOfBirth;
            case "approvalStatus" -> approvalStatus;
            case "userType" -> userType;
            case "lawyerSpecialization" -> lawyerSpecialization;
            case "lawFirmName" -> lawFirmName;
            case "lawSchool" -> lawSchool;
            case "yearsExperience" -> yearsExperience;
            case "barNumber" -> barNumber;
            case "lcLevel" -> lcLevel;
            case "lcPosition" -> lcPosition;
            case "organizationName" -> organizationName;
            case "organizationType" -> organizationType;
            case "specialization" -> specialization;
            case "nextOfKinName" -> nextOfKinName;
            case "nextOfKinPhone" -> nextOfKinPhone;
            case "nextOfKinEmail" -> nextOfKinEmail;
            case "nextOfKinRelationship" -> nextOfKinRelationship;
            case "avatarData" -> avatarData;
            default -> null;
        };
    }
}
