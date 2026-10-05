package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SessionIdentity {

    private SessionIdentity() {
    }

    public static String username(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            Object sessionUsername = session.getAttribute("username");
            if (sessionUsername != null && !sessionUsername.toString().isBlank()) {
                return sessionUsername.toString();
            }
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            String username = ((User) principal).getUsername();
            return username == null || username.isBlank() ? null : username;
        }
        String name = authentication.getName();
        return name == null || name.isBlank() || "anonymousUser".equals(name) ? null : name;
    }

    public static String role(HttpServletRequest request, String username, JdbcTemplate jdbcTemplate) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("role") != null) {
            return session.getAttribute("role").toString();
        }
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT role FROM users WHERE username = ?", String.class, username);
        } catch (Exception ignored) {
            return null;
        }
    }
}
