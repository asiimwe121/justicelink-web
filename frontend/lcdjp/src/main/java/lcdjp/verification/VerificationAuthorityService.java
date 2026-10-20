package lcdjp.verification;

import lcdjp.security.RoleAuthority;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class VerificationAuthorityService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public boolean isDistrictAdminOnlyVerificationRole(String requestedRole) {
        if (requestedRole == null) return false;
        String role = normalizeVerificationRole(requestedRole).toLowerCase();
        return role.equals("lawyer")
                || role.equals("lc1")
                || role.equals("lc2")
                || role.equals("lc3")
                || role.equals("citizen");
    }

    public String normalizeVerificationRole(String requestedRole) {
        if (requestedRole == null) return null;
        String role = requestedRole.trim();
        if (role.matches("(?i)^lc1(?:\\s+official)?$")) return "lc1";
        if (role.matches("(?i)^lc2(?:\\s+official)?$")) return "lc2";
        if (role.matches("(?i)^lc3(?:\\s+official)?$")) return "lc3";
        return role;
    }

    public boolean isAllowedVerificationRole(String requestedRole) {
        if (requestedRole == null) return true;
        String role = normalizeVerificationRole(requestedRole).toLowerCase();
        return role.equals("citizen") || role.equals("lawyer");
    }

    public boolean districtMatches(String requestedDistrict, String assignedDistrict) {
        return requestedDistrict != null
                && assignedDistrict != null
                && !requestedDistrict.trim().isEmpty()
                && !assignedDistrict.trim().isEmpty()
                && requestedDistrict.trim().equalsIgnoreCase(assignedDistrict.trim());
    }

    public boolean hasDistrictAdminForDistrict(String district) {
        if (district == null || district.trim().isEmpty()) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users " +
                        "WHERE LOWER(TRIM(role)) IN " +
                        "('district_admin', 'district admin', 'district administrator') " +
                        "AND LOWER(TRIM(district)) = LOWER(TRIM(?))",
                Integer.class,
                district.trim()
        );
        return count != null && count > 0;
    }

    public ResponseEntity<?> authorityError(String reviewerRole,
                                             String reviewerDistrict,
                                             String requestedRole,
                                             String targetDistrict,
                                             LocalDateTime submittedAt,
                                             String actionPhrase) {
        boolean districtAdminAssigned = hasDistrictAdminForDistrict(targetDistrict);
        boolean overduePastTwentyFourHours = submittedAt != null
                && submittedAt.isBefore(LocalDateTime.now().minusHours(24));
        boolean systemAdminEscalated = RoleAuthority.isSystemAdminRole(reviewerRole) && overduePastTwentyFourHours;

        if (isDistrictAdminOnlyVerificationRole(requestedRole) && districtAdminAssigned
                && !RoleAuthority.isDistrictAdminRole(reviewerRole) && !systemAdminEscalated) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "This verification must be " + actionPhrase + " by the District Admin " +
                            "assigned to the applicant's district" +
                            (overduePastTwentyFourHours ? "." :
                                    " (the System Admin can also step in once 24 hours have passed).")));
        }
        if (RoleAuthority.isDistrictAdminRole(reviewerRole)
                && !districtMatches(targetDistrict, reviewerDistrict)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "District Admins can only " + actionPhrase + " verification requests in their assigned district."));
        }
        return null;
    }
}
