package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Arrays;
import java.util.List;

@Component
public class DistrictFilterInterceptor implements HandlerInterceptor {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String requestURI = request.getRequestURI();

        HttpSession session = request.getSession(false);
        String username = session == null ? null : stringValue(session.getAttribute("username"));
        String role = session == null ? null : stringValue(session.getAttribute("role"));
        String loggedInDistrict = session == null ? null : stringValue(session.getAttribute("district"));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if ((username == null || username.isBlank())
                && authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                User user = (User) principal;
                username = user.getUsername();
                role = user.getRole();
                loggedInDistrict = user.getDistrict();
            }
        }

        if (username == null || username.isBlank()) {
            return true;
        }

        String normalizedRole = role == null ? "" : role.trim().toUpperCase().replace(' ', '_');
        if (normalizedRole.equals("SYSTEM_ADMIN")
                || normalizedRole.equals("SYSTEM_ADMINISTRATOR")
                || normalizedRole.equals("ADMIN")) {
            return true;
        }

        if (!normalizedRole.equals("DISTRICT_ADMIN")
                && !normalizedRole.equals("DISTRICT_ADMINISTRATOR")) {
            return true;
        }

        if (loggedInDistrict == null || loggedInDistrict.isBlank()) {
            loggedInDistrict = jdbcTemplate.queryForObject(
                    "SELECT district FROM users WHERE username = ?", String.class, username);
        }
        if (loggedInDistrict == null) {
            response.sendError(403, "District Admin has no assigned district.");
            return false;
        }

        List<String> restrictedPrefixes = Arrays.asList(
                "/api/users/", "/api/admin/", "/api/cases/", "/api/district-admin/", "/api/statistics/"
        );

        for (String prefix : restrictedPrefixes) {
            if (requestURI.startsWith(prefix)) {
                String requestedUsername = extractUsernameFromRequest(request);
                if (requestedUsername != null && !requestedUsername.isEmpty()) {
                    if (requestedUsername.equalsIgnoreCase("statistics")
                            || requestedUsername.equalsIgnoreCase("verification-requests")
                            || requestedUsername.equalsIgnoreCase("pending")) {
                        continue;
                    }
                    String checkSql = "SELECT district FROM users WHERE username = ?";
                    String targetDistrict;
                    try {
                        targetDistrict = jdbcTemplate.queryForObject(checkSql, String.class, requestedUsername);
                    } catch (Exception ignored) {
                        continue;
                    }

                    if (targetDistrict != null && !loggedInDistrict.equals(targetDistrict)) {
                        response.sendError(403, "Access forbidden: User does not belong to your district.");
                        return false;
                    }
                }
            }
        }
        return true;
    }

    private String extractUsernameFromRequest(HttpServletRequest request) {

        String path = request.getRequestURI();
        String[] parts = path.split("/");
        if (parts.length > 0) {
            return parts[parts.length - 1];
        }
        return null;
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }
}