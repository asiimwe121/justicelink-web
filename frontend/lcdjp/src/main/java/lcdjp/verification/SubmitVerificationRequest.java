package lcdjp.verification;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class SubmitVerificationRequest {
    @Size(max = 20_000_000)
    private String idFront;
    @Size(max = 20_000_000)
    private String idBack;
    @Size(max = 255)
    private String nationalId;
    @Size(max = 20_000_000)
    private String lawyerWorkId;
    @Size(max = 20_000_000)
    private String lawyerCertificate;
    @Size(max = 20_000_000)
    private String lawyerCVData;
    @JsonAlias("roleDoc_lawSpec")
    @Size(max = 255)
    private String lawyerSpecialization;
    @JsonAlias("roleDoc_barNo")
    @Size(max = 255)
    private String barNumber;

    private String verificationRole;
    @JsonAlias("requestedRole")
    private String requestedRoleAlias;

    private String verificationDistrict;
    @JsonAlias("districtAdminDistrict")
    private String districtAdminDistrict;
    private String district;

    private String latitude;
    private String longitude;
    private String locationLabel;

    public String getVerificationRole() {
        return verificationRole != null ? verificationRole : requestedRoleAlias;
    }

    public String getDistrict() {
        if (verificationDistrict != null) return verificationDistrict;
        if (districtAdminDistrict != null) return districtAdminDistrict;
        return district;
    }
}
