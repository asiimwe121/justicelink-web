package lcdjp.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegistrationRequest {

    @JsonProperty("_otpVerified")
    private Boolean otpVerified;

    @JsonProperty("_passwordHash")
    private String passwordHash;

    @NotBlank(message = "Username is required")
    @Size(min = 8, max = 255, message = "Username must be between 8 and 255 characters")
    private String username;

    private String password;

    private String firstName;
    private String lastName;
    private String phoneNumber;

    @Email(message = "Email must be a valid address")
    private String email;

    private String district;
    private String subCounty;
    private String parish;
    private String village;
    private String nationalId;
    private String gender;
    private String dateOfBirth;

    private String latitude;
    private String longitude;

    private String nextOfKinName;
    private String nextOfKinPhone;
    private String nextOfKinEmail;
    private String nextOfKinRelationship;

    private String lawyerSpecialization;
    private String lawFirmName;
    private String lawSchool;
    private String yearsExperience;
    private String barNumber;

    private String lcLevel;
    private String lcPosition;

    private String organizationName;
    private String organizationType;
    private String specialization;

    private String idFront;
    private String idBack;
    private String lawyerWorkId;
    private String lawyerCertificate;
    private String lawyerCVData;
    private String lawyerCVName;

    private String lawyerCVSize;
    private String lawyerCVType;

    private String lcAppointmentLetter;
    private String lcOfficialId;
}
