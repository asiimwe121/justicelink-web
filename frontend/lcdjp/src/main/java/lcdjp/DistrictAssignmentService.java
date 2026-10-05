package lcdjp;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.LocalDateTime;

@Service
public class DistrictAssignmentService {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DistrictAssignmentService.class);
    @Autowired
    private JdbcTemplate jdbcTemplate;

    public String determineDistrictFromCoordinates(double latitude, double longitude) {

        if (latitude == 0.0 && longitude == 0.0) return "Unknown";
        return "Kampala";
    }

    public void assignDistrictToUser(String username, double latitude, double longitude) {

        String newDistrict = determineDistrictFromCoordinates(latitude, longitude);
        if (newDistrict == null || newDistrict.equals("Unknown")) {
            return;
        }

        String checkSql = "SELECT district FROM users WHERE username = ?";
        String currentDistrict = null;
        try {
            currentDistrict = jdbcTemplate.queryForObject(checkSql, String.class, username);
        } catch (Exception e) {

            currentDistrict = null;
        }

        String updateSql = "UPDATE users SET district = ?, latitude = ?, longitude = ?, district_assigned_at = NOW() WHERE username = ?";
        jdbcTemplate.update(updateSql, newDistrict, latitude, longitude, username);

        if (currentDistrict == null) {
            logger.info("🆕 User " + username + " assigned to " + newDistrict + " for the first time.");
        } else if (!currentDistrict.equals(newDistrict)) {
            logger.info("🔄 User " + username + " moved from " + currentDistrict + " to " + newDistrict);
        }
    }
}