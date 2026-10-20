package lcdjp.admin;

import lcdjp.security.JwtUtil;
import lcdjp.security.RoleAuthority;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Response-time metrics per district. District admins see only their own district;
 * system admins see every district. Aggregates only, no case content.
 * Path is covered by the existing /api/district-admin/** rule in SecurityConfig.
 */
@RestController
@RequestMapping("/api/district-admin")
public class DistrictMetricsController {

    @Autowired
    private DistrictMetricsRepository metricsRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/metrics")
    public ResponseEntity<?> metrics(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing token"));
        }
        String role;
        String district;
        try {
            String token = header.substring(7);
            role = jwtUtil.extractRole(token);
            district = jwtUtil.extractDistrict(token);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }

        boolean system = RoleAuthority.isSystemAdminRole(role);
        if (!system && !RoleAuthority.isDistrictAdminRole(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not allowed"));
        }
        if (!system && (district == null || district.isBlank())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "No district assigned"));
        }

        List<Map<String, Object>> rows = system
                ? metricsRepository.findAllDistricts()
                : metricsRepository.findByDistrict(district);

        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("district", r.get("district"));
            m.put("totalCases", num(r.get("total")));
            m.put("openCases", num(r.get("open_cases")));
            m.put("resolvedCases", num(r.get("resolved_cases")));
            m.put("escalatedOpen", num(r.get("escalated_open")));
            m.put("avgFirstResponseHours", hours(r.get("avg_first_response_min")));
            m.put("avgResolutionHours", hours(r.get("avg_resolution_min")));
            out.add(m);
        }
        return ResponseEntity.ok(Map.of("districts", out));
    }

    private static long num(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }

    /** Minutes to hours, one decimal; null when no case has that measurement yet. */
    private static Double hours(Object minutes) {
        if (!(minutes instanceof Number)) return null;
        return Math.round(((Number) minutes).doubleValue() / 6.0) / 10.0;
    }
}
