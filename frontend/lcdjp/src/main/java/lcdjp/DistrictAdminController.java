package lcdjp;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

@RestController
@RequestMapping("/api/district-admin")
public class DistrictAdminController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DistrictAdminController.class);
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private AuditLogService auditLogService;
    @Autowired
    private BCryptPasswordEncoder passwordEncoder;
    @Autowired
    private AccountCreationOtpService accountCreationOtpService;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private DistrictAdminController self;

    public DistrictAdminController() {
        logger.info("✅ DistrictAdminController loaded successfully!");
    }

    private Map<String, Object> getUserDetailsFromToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                String username = jwtUtil.extractUsername(token);

                String role = jwtUtil.extractRole(token);
                String district = jwtUtil.extractDistrict(token);

                Map<String, Object> details = new HashMap<>();
                details.put("username", username);
                details.put("role", role);
                details.put("district", district);
                return details;
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    @PostMapping("/create")
    @CacheEvict(value = "statistics", key = "'districtAdmins'")
    public ResponseEntity<?> createDistrictAdmin(
            @Valid @RequestBody CreateDistrictAdminRequest request,
            HttpServletRequest httpRequest) {
        try {
            Map<String, Object> userDetails = getUserDetailsFromToken(httpRequest);
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or missing authentication token"));
            }

            String loggedInUser = (String) userDetails.get("username");
            String role = (String) userDetails.get("role");

            logger.info("🔍 Create District Admin - User: " + loggedInUser + ", Role: '" + role + "'");

            String lowerRole = role != null ? role.toLowerCase() : "";
            if (!lowerRole.equals("system_admin") && !lowerRole.equals("admin")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only System Administrators can create district admins. Your role: " + role));
            }

            String username = request.getUsername();
            String password = request.getPassword();
            String firstName = request.getFirstName();
            String lastName = request.getLastName();
            String email = request.getEmail();
            String phone = request.getPhone();
            String district = request.getDistrict();

            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            if (username.length() < 8) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username must be at least 8 characters"));
            }
            if (password == null || password.length() < 8) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters"));
            }
            if (district == null || district.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "District is required"));
            }

            if (!accountCreationOtpService.isVerified(httpRequest, "DISTRICT_ADMIN", email, phone)) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                        .body(Map.of("error", "Please verify this email/phone with a one-time code before creating the account"));
            }

            String checkSql = "SELECT COUNT(*) FROM users WHERE username = ?";
            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, username);
            if (count > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Username already exists"));
            }

            String insertSql = "INSERT INTO users (username, password_hash, first_name, last_name, role, " +
                    "email, phone, district, approval_status, is_active, user_type, password_changed, created_at) " +
                    "VALUES (?, ?, ?, ?, 'DISTRICT_ADMIN', ?, ?, ?, 'Approved', 1, 'individual', 0, NOW())";

            jdbcTemplate.update(insertSql, username, passwordEncoder.encode(password),
                    firstName, lastName, email, phone, district);

            accountCreationOtpService.consume(httpRequest);

            auditLogService.logAction(
                    loggedInUser,
                    role,
                    "DISTRICT_ADMIN_CREATED",
                    "user",
                    username,
                    "District Admin created for district: " + district
            );

            logger.info("✅ District Admin created: " + username + " for district: " + district);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "District Admin created successfully",
                    "username", username,
                    "district", district
            ));

        } catch (Exception e) {
            logger.error("❌ Error creating district admin: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getDistrictAdmins(HttpServletRequest httpRequest) {
        try {
            Map<String, Object> userDetails = getUserDetailsFromToken(httpRequest);
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or missing authentication token"));
            }

            String role = (String) userDetails.get("role");
            logger.info("🔍 DistrictAdmin list - JWT Role: '" + role + "'");

            String lowerRole = role != null ? role.toLowerCase() : "";
            if (!lowerRole.equals("system_admin") && !lowerRole.equals("admin") && !lowerRole.equals("district_admin")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Your role: " + role));
            }

            String sql = "SELECT user_id, username, first_name, last_name, email, phone, role, district, " +
                    "approval_status, is_active, created_at FROM users WHERE role = 'DISTRICT_ADMIN'";

            List<Map<String, Object>> districtAdmins = jdbcTemplate.queryForList(sql);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "districtAdmins", districtAdmins,
                    "count", districtAdmins.size()
            ));

        } catch (Exception e) {
            logger.error("❌ Error fetching district admins: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/district/{district}")
    public ResponseEntity<?> getDistrictAdminByDistrict(@PathVariable String district, HttpServletRequest httpRequest) {
        try {
            Map<String, Object> userDetails = getUserDetailsFromToken(httpRequest);
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or missing authentication token"));
            }

            String role = (String) userDetails.get("role");
            String loggedInDistrict = (String) userDetails.get("district");

            logger.info("🔍 DistrictAdmin by district - Role: '" + role + "', District: " + district);

            String lowerRole = role != null ? role.toLowerCase() : "";
            if (lowerRole.equals("district_admin")) {
                if (!district.equals(loggedInDistrict)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You can only access your own district"));
                }
            }

            String sql = "SELECT user_id, username, first_name, last_name, email, phone, role, district, " +
                    "approval_status, is_active, created_at FROM users WHERE role = 'DISTRICT_ADMIN' AND district = ?";

            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, district);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No district admin found for district: " + district));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "districtAdmin", results.get(0)
            ));

        } catch (Exception e) {
            logger.error("❌ Error fetching district admin: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getDistrictAdminStatistics(HttpServletRequest httpRequest) {
        try {
            Map<String, Object> userDetails = getUserDetailsFromToken(httpRequest);
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or missing authentication token"));
            }

            String role = (String) userDetails.get("role");
            logger.info("🔍 DistrictAdmin statistics - JWT Role: '" + role + "'");

            String lowerRole = role != null ? role.toLowerCase() : "";
            if (!lowerRole.equals("system_admin") && !lowerRole.equals("admin")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Your role: " + role));
            }

            Map<String, Object> stats = self.computeDistrictAdminStatistics();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "statistics", stats
            ));

        } catch (Exception e) {
            logger.error("❌ Error fetching district admin statistics: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @Cacheable(value = "statistics", key = "'districtAdmins'")
    public Map<String, Object> computeDistrictAdminStatistics() {
        String countSql = "SELECT COUNT(*) FROM users WHERE role = 'DISTRICT_ADMIN'";
        Integer total = jdbcTemplate.queryForObject(countSql, Integer.class);

        String districtsSql = "SELECT district, COUNT(*) as count FROM users WHERE role = 'DISTRICT_ADMIN' GROUP BY district ORDER BY district";
        List<Map<String, Object>> districts = jdbcTemplate.queryForList(districtsSql);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalDistrictAdmins", total != null ? total : 0);
        stats.put("districtsWithAdmins", districts.size());
        stats.put("districtBreakdown", districts);
        return stats;
    }
}