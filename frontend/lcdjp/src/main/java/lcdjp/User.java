package lcdjp;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import java.security.Principal;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor

public class User implements Principal {

    public User(Long id, String username, String role, String district, Boolean isActive) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.district = district;
        this.isActive = isActive;
    }

    public User(Long id, String username, String role, String district, Boolean isActive,
                String verificationStatus, String approvalStatus) {
        this(id, username, role, district, isActive);
        this.verificationStatus = verificationStatus;
        this.approvalStatus = approvalStatus;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    @ToString.Exclude
    private String password;

    private String role;

    @Column(name = "requested_role")
    private String requestedRole;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    private String email;
    private String phone;

    @Column(name = "user_type")
    private String userType;

    private String district;
    private String subCounty;
    private String parish;
    private String village;

    @Column(name = "national_id")
    private String nationalId;

    private String gender;

    @Column(name = "date_of_birth")
    private String dateOfBirth;

    @Column(name = "approval_status")
    private String approvalStatus;

    @Lob
    @Column(name = "id_front", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String idFront;

    @Lob
    @Column(name = "id_back", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String idBack;

    @Lob
    @Column(name = "lawyer_work_id", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String lawyerWorkId;

    @Lob
    @Column(name = "lawyer_certificate", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String lawyerCertificate;

    @Lob
    @Column(name = "lawyer_cv_data", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String lawyerCVData;

    @Column(name = "lawyer_cv_name")
    private String lawyerCVName;

    @Column(name = "lawyer_cv_size")
    private Long lawyerCVSize;

    @Column(name = "lawyer_cv_type")
    private String lawyerCVType;

    @Lob
    @Column(name = "lc_appointment_letter", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String lcAppointmentLetter;

    @Column(name = "lc_official_id")
    private String lcOfficialId;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String documents;

    @Column(name = "lawyer_specialization")
    private String lawyerSpecialization;

    @Column(name = "law_firm_name")
    private String lawFirmName;

    @Column(name = "law_school")
    private String lawSchool;

    @Column(name = "years_experience")
    private Integer yearsExperience;

    @Column(name = "bar_number")
    private String barNumber;

    @Column(name = "lc_level")
    private String lcLevel;

    @Column(name = "lc_position")
    private String lcPosition;

    @Column(name = "organization_name")
    private String organizationName;

    @Column(name = "organization_type")
    private String organizationType;

    private String specialization;

    @Column(name = "next_of_kin_name")
    private String nextOfKinName;

    @Column(name = "next_of_kin_phone")
    private String nextOfKinPhone;

    @Column(name = "next_of_kin_email")
    private String nextOfKinEmail;

    @Column(name = "next_of_kin_relationship")
    private String nextOfKinRelationship;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Lob
    @Column(name = "avatar_data", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String avatarData;

    @Column(name = "verification_status")
    private String verificationStatus = "BASIC";

    @Column(name = "verification_level")
    private String verificationLevel = "BASIC";

    @Lob
    @Column(name = "verification_documents", columnDefinition = "LONGTEXT")
    @ToString.Exclude
    private String verificationDocuments;
    @Column(name = "verification_submitted_at")
    private LocalDateTime verificationSubmittedAt;

    @Column(name = "verification_reviewed_at")
    private LocalDateTime verificationReviewedAt;

    @Column(name = "verification_reviewed_by")
    private String verificationReviewedBy;

    @Column(name = "verification_rejection_reason")
    private String verificationRejectionReason;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getFullName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getVerificationLevel() { return verificationLevel; }
    public void setVerificationLevel(String verificationLevel) { this.verificationLevel = verificationLevel; }

    public String getVerificationDocuments() { return verificationDocuments; }
    public void setVerificationDocuments(String verificationDocuments) { this.verificationDocuments = verificationDocuments; }

    public LocalDateTime getVerificationSubmittedAt() { return verificationSubmittedAt; }
    public void setVerificationSubmittedAt(LocalDateTime verificationSubmittedAt) { this.verificationSubmittedAt = verificationSubmittedAt; }

    public LocalDateTime getVerificationReviewedAt() { return verificationReviewedAt; }
    public void setVerificationReviewedAt(LocalDateTime verificationReviewedAt) { this.verificationReviewedAt = verificationReviewedAt; }

    public String getVerificationReviewedBy() { return verificationReviewedBy; }
    public void setVerificationReviewedBy(String verificationReviewedBy) { this.verificationReviewedBy = verificationReviewedBy; }

    public String getVerificationRejectionReason() { return verificationRejectionReason; }
    public void setVerificationRejectionReason(String verificationRejectionReason) { this.verificationRejectionReason = verificationRejectionReason; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    @Override
    public String getName() { return username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getSubCounty() { return subCounty; }
    public void setSubCounty(String subCounty) { this.subCounty = subCounty; }

    public String getParish() { return parish; }
    public void setParish(String parish) { this.parish = parish; }

    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }

    public String getNationalId() { return nationalId; }
    public void setNationalId(String nationalId) { this.nationalId = nationalId; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getIdFront() { return idFront; }
    public void setIdFront(String idFront) { this.idFront = idFront; }

    public String getIdBack() { return idBack; }
    public void setIdBack(String idBack) { this.idBack = idBack; }

    public String getLawyerWorkId() { return lawyerWorkId; }
    public void setLawyerWorkId(String lawyerWorkId) { this.lawyerWorkId = lawyerWorkId; }

    public String getLawyerCertificate() { return lawyerCertificate; }
    public void setLawyerCertificate(String lawyerCertificate) { this.lawyerCertificate = lawyerCertificate; }

    public String getLawyerCVData() { return lawyerCVData; }
    public void setLawyerCVData(String lawyerCVData) { this.lawyerCVData = lawyerCVData; }

    public String getLawyerCVName() { return lawyerCVName; }
    public void setLawyerCVName(String lawyerCVName) { this.lawyerCVName = lawyerCVName; }

    public Long getLawyerCVSize() { return lawyerCVSize; }
    public void setLawyerCVSize(Long lawyerCVSize) { this.lawyerCVSize = lawyerCVSize; }

    public String getLawyerCVType() { return lawyerCVType; }
    public void setLawyerCVType(String lawyerCVType) { this.lawyerCVType = lawyerCVType; }

    public String getLcAppointmentLetter() { return lcAppointmentLetter; }
    public void setLcAppointmentLetter(String lcAppointmentLetter) { this.lcAppointmentLetter = lcAppointmentLetter; }

    public String getLcOfficialId() { return lcOfficialId; }
    public void setLcOfficialId(String lcOfficialId) { this.lcOfficialId = lcOfficialId; }

    public String getDocuments() { return documents; }
    public void setDocuments(String documents) { this.documents = documents; }

    public String getLawyerSpecialization() { return lawyerSpecialization; }
    public void setLawyerSpecialization(String lawyerSpecialization) { this.lawyerSpecialization = lawyerSpecialization; }

    public String getLawFirmName() { return lawFirmName; }
    public void setLawFirmName(String lawFirmName) { this.lawFirmName = lawFirmName; }

    public String getLawSchool() { return lawSchool; }
    public void setLawSchool(String lawSchool) { this.lawSchool = lawSchool; }

    public Integer getYearsExperience() { return yearsExperience; }
    public void setYearsExperience(Integer yearsExperience) { this.yearsExperience = yearsExperience; }

    public String getBarNumber() { return barNumber; }
    public void setBarNumber(String barNumber) { this.barNumber = barNumber; }

    public String getLcLevel() { return lcLevel; }
    public void setLcLevel(String lcLevel) { this.lcLevel = lcLevel; }

    public String getLcPosition() { return lcPosition; }
    public void setLcPosition(String lcPosition) { this.lcPosition = lcPosition; }

    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }

    public String getOrganizationType() { return organizationType; }
    public void setOrganizationType(String organizationType) { this.organizationType = organizationType; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public String getNextOfKinName() { return nextOfKinName; }
    public void setNextOfKinName(String nextOfKinName) { this.nextOfKinName = nextOfKinName; }

    public String getNextOfKinPhone() { return nextOfKinPhone; }
    public void setNextOfKinPhone(String nextOfKinPhone) { this.nextOfKinPhone = nextOfKinPhone; }

    public String getNextOfKinEmail() { return nextOfKinEmail; }
    public void setNextOfKinEmail(String nextOfKinEmail) { this.nextOfKinEmail = nextOfKinEmail; }

    public String getNextOfKinRelationship() { return nextOfKinRelationship; }
    public void setNextOfKinRelationship(String nextOfKinRelationship) { this.nextOfKinRelationship = nextOfKinRelationship; }

    public Boolean isActive() { return isActive; }
    public void setActive(Boolean active) { isActive = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getAvatarData() { return avatarData; }
    public void setAvatarData(String avatarData) { this.avatarData = avatarData; }

}