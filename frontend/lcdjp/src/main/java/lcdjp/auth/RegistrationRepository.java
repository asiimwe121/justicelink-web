package lcdjp.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** SQL for registration and identity verification that RegistrationController used to run itself. */
@Repository
public class RegistrationRepository {

    private static final String INSERT_USER =
            "INSERT INTO users (" +
                    "username, password_hash, first_name, last_name, role, " +
                    "phone, email, district, sub_county, parish, village, national_id, " +
                    "gender, date_of_birth, " +
                    "next_of_kin_name, next_of_kin_phone, next_of_kin_email, next_of_kin_relationship, " +
                    "lawyer_specialization, law_firm_name, law_school, years_experience, bar_number, " +
                    "lc_level, lc_position, " +
                    "organization_name, organization_type, specialization, " +
                    "id_front, id_back, lawyer_work_id, lawyer_certificate, lawyer_cv_data, lawyer_cv_name, lawyer_cv_size, lawyer_cv_type, " +
                    "lc_appointment_letter, lc_official_id, " +
                    "approval_status, user_type, verification_status, created_at" +
                    ") VALUES (" +
                    "?, ?, ?, ?, ?, " +
                    "?, ?, ?, ?, ?, ?, ?, " +
                    "?, ?, " +
                    "?, ?, ?, ?, " +
                    "?, ?, ?, ?, ?, " +
                    "?, ?, " +
                    "?, ?, ?, " +
                    "?, ?, ?, ?, ?, ?, ?, ?, " +
                    "?, ?, " +
                    "?, ?, 'NOT_SUBMITTED', NOW())";

    private static final String COUNT_BY_USERNAME_OR_EMAIL =
            "SELECT COUNT(*) FROM users WHERE username = ? " +
                    "OR (email IS NOT NULL AND email != '' AND LOWER(email) = LOWER(?))";

    private static final String SUBMIT_VERIFICATION =
            "UPDATE users SET id_front = ?, id_back = ?, national_id = ?, lawyer_work_id = ?, " +
                    "lawyer_certificate = ?, lawyer_cv_data = ?, " +
                    "lawyer_specialization = COALESCE(?, lawyer_specialization), " +
                    "bar_number = COALESCE(?, bar_number), " +
                    "verification_documents = ?, " +
                    "verification_status = 'PENDING', verification_submitted_at = NOW(), " +
                    "requested_role = COALESCE(?, requested_role) " +
                    "WHERE username = ?";

    private final JdbcTemplate jdbcTemplate;

    public RegistrationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Number of accounts with this username, or with this email (compared case-insensitively). */
    public int countByUsernameOrEmail(String username, String email) {
        Integer count = jdbcTemplate.queryForObject(COUNT_BY_USERNAME_OR_EMAIL, Integer.class, username, email);
        return count == null ? 0 : count;
    }

    public int countByUsername(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username);
        return count == null ? 0 : count;
    }

    /**
     * Inserts a new user. The values are bound positionally, in the order of the columns in {@code INSERT_USER}
     * (username, password_hash, first_name, ... verification_status is fixed to NOT_SUBMITTED).
     */
    public void insertUser(Object... values) {
        jdbcTemplate.update(INSERT_USER, values);
    }

    /** Accounts other than {@code username} that already use this (normalized) national ID. */
    public int countOtherUsersWithNationalId(String normalizedNationalId, String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE UPPER(TRIM(national_id)) = ? AND username <> ?",
                Integer.class, normalizedNationalId, username);
        return count == null ? 0 : count;
    }

    public void updateDistrictAndLocation(String district, double latitude, double longitude, String username) {
        jdbcTemplate.update(
                "UPDATE users SET district = ?, latitude = ?, longitude = ?, district_assigned_at = NOW() " +
                        "WHERE username = ?",
                district, latitude, longitude, username);
    }

    public void updateDistrict(String district, String username) {
        jdbcTemplate.update("UPDATE users SET district = ? WHERE username = ?", district, username);
    }

    /** Stores the submitted documents and puts the account into PENDING verification. */
    public void submitVerification(String idFront, String idBack, String nationalId, String lawyerWorkId,
                                   String lawyerCertificate, String lawyerCv, String lawyerSpecialization,
                                   String barNumber, String verificationDocuments, String requestedRole,
                                   String username) {
        jdbcTemplate.update(SUBMIT_VERIFICATION, idFront, idBack, nationalId, lawyerWorkId, lawyerCertificate,
                lawyerCv, lawyerSpecialization, barNumber, verificationDocuments, requestedRole, username);
    }
}
