package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.regex.Pattern;

@Component
public class VerificationInterceptor implements HandlerInterceptor {

    private static final boolean VERIFICATION_ENFORCEMENT_ENABLED = true;

    private final UserService userService;

    public VerificationInterceptor(UserService userService) {
        this.userService = userService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();

        if (isPublicEndpoint(path)) {
            return true;
        }

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return deny(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof User)) {
            return deny(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid authentication");
        }

        User user = (User) principal;
        String username = user.getUsername();

        if (isAdministrator(user.getRole())) {
            return true;
        }

        String requestedCitizen = citizenCaseOwner(path);
        if (requestedCitizen != null) {
            if (!requestedCitizen.equalsIgnoreCase(username)) {
                return deny(response, HttpServletResponse.SC_FORBIDDEN,
                        "You can only access your own cases");
            }
            return true;
        }

        String verifStatusOwner = verificationStatusOwner(path, request.getMethod());
        if (verifStatusOwner != null) {
            if (!verifStatusOwner.equalsIgnoreCase(username)) {
                return deny(response, HttpServletResponse.SC_FORBIDDEN,
                        "You can only access your own verification status");
            }
            return true;
        }

        if (!isVerificationApproved(user)) {
            return deny(response, HttpServletResponse.SC_FORBIDDEN,
                    "Account verification required to access this feature");
        }

        return true;
    }

    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/auth/login") ||
                path.startsWith("/api/auth/register") ||
                path.equals("/api/auth/send-otp") ||
                path.equals("/api/auth/verify-otp") ||
                path.equals("/api/auth/forgot-password") ||
                path.equals("/api/auth/reset-password") ||
                path.equals("/api/auth/reset-link/validate") ||
                path.equals("/api/auth/reset-link/confirm") ||
                path.startsWith("/api/health") ||
                path.startsWith("/api/translate") ||
                path.startsWith("/api/verification/") ||
                path.startsWith("/api/emergencies/") ||
                path.startsWith("/api/legal-orgs/") ||
                path.equals("/api/lc-offices/all") ||
                path.equals("/api/lc-offices/nearby") ||
                path.equals("/api/police-stations/all") ||
                path.equals("/api/police-stations/nearby") ||
                path.startsWith("/api-docs/") ||
                path.startsWith("/swagger-ui/") ||
                path.equals("/") ||
                path.endsWith(".html") ||
                path.endsWith(".css") ||
                path.endsWith(".js");
    }

    private String citizenCaseOwner(String path) {
        if (path == null) return null;
        var matcher = Pattern.compile("^/api/cases/citizen/([^/]+)/?$").matcher(path);
        return matcher.matches() ? matcher.group(1) : null;
    }

    private String verificationStatusOwner(String path, String method) {
        if (path == null || !"GET".equalsIgnoreCase(method)) return null;
        var matcher = Pattern.compile("^/api/auth/users/([^/]+)/verification-status/?$").matcher(path);
        return matcher.matches() ? matcher.group(1) : null;
    }

    private boolean isVerificationApproved(User user) {
        if (!VERIFICATION_ENFORCEMENT_ENABLED) {
            return true;
        }

        if (user == null) return false;
        String verificationStatus = normalize(user.getVerificationStatus());

        if (verificationStatus.equals("APPROVED") ||
                verificationStatus.equals("VERIFIED") ||
                verificationStatus.equals("ACTIVE")) {
            return true;
        }
        if (verificationStatus.equals("PENDING") ||
                verificationStatus.equals("REJECTED")) {
            return false;
        }

        String approvalStatus = normalize(user.getApprovalStatus());
        return approvalStatus.equals("APPROVED") ||
                approvalStatus.equals("VERIFIED") ||
                approvalStatus.equals("ACTIVE");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase().replace(' ', '_');
    }

    private boolean isAdministrator(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("ADMIN") ||
                normalized.equals("SYSTEM_ADMIN") ||
                normalized.equals("SYSTEM_ADMINISTRATOR") ||
                normalized.equals("DISTRICT_ADMIN");
    }

    private boolean deny(HttpServletResponse response, int status, String message) throws Exception {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message.replace("\"", "\\\"") + "\"}");
        return false;
    }
}