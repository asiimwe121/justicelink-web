package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class DistrictAdminCaseReadOnlyInterceptor implements HandlerInterceptor {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DistrictAdminCaseReadOnlyInterceptor.class);
    private static final boolean CASE_FEATURES_ENABLED = true;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        String method = request.getMethod();
        boolean isRead = "GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method);
        String role = resolveRole(request);

        if (isSystemAdmin(role)) {
            return true;
        }

        boolean isDistrictAdminRole = isDistrictAdmin(role);

        if (!CASE_FEATURES_ENABLED) {
            if ("OPTIONS".equals(method)) return true;
            if (isRead && isDistrictAdminRole) {
                return true;
            }
            return deny(response, "Case reporting and case management are temporarily "
                    + "unavailable. Everything else on JusticeLink — the legal library, "
                    + "emergency services, and legal aid contacts — still works as usual.");
        }

        if (isRead || !isDistrictAdminRole) {
            return true;
        }

        logger.warn("Blocked case write by District Admin: {} {}", method, request.getRequestURI());
        return deny(response, "District Admins have view-only access to cases. "
                + "Cases are handled by LC officials, lawyers and legal organizations.");
    }

    private boolean deny(HttpServletResponse response, String message) throws Exception {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"success\":false,\"error\":\"" + message.replace("\"", "\\\"") + "\"}");
        return false;
    }

    private String resolveRole(HttpServletRequest request) {
        String username = null;

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                User user = (User) principal;
                if (user.getRole() != null && !user.getRole().isBlank()) {
                    return user.getRole();
                }
                username = user.getUsername();
            } else if (!"anonymousUser".equals(authentication.getName())) {
                username = authentication.getName();
            }
        }

        HttpSession session = request.getSession(false);
        if (session != null) {
            Object sessionRole = session.getAttribute("role");
            if (sessionRole != null && !sessionRole.toString().isBlank()) {
                return sessionRole.toString();
            }
            if (username == null && session.getAttribute("username") != null) {
                username = session.getAttribute("username").toString();
            }
        }

        if (username == null || username.isBlank()) {
            return null;
        }

        try {
            return jdbcTemplate.queryForObject(
                    "SELECT role FROM users WHERE username = ?", String.class, username);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isDistrictAdmin(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("DISTRICT_ADMIN") || normalized.equals("DISTRICT_ADMINISTRATOR");
    }

    private boolean isSystemAdmin(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                || normalized.equals("SYSTEM_ADMINISTRATOR");
    }
}
