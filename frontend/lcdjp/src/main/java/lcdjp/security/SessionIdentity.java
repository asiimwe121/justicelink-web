package lcdjp.security;

import lcdjp.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.function.Function;
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

    /**
     * The caller's role: the session value when there is one, otherwise whatever {@code roleLookup} returns for
     * the username (a lookup failure counts as "no role").
     */
    public static String role(HttpServletRequest request, String username, Function<String, String> roleLookup) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("role") != null) {
            return session.getAttribute("role").toString();
        }
        try {
            return roleLookup.apply(username);
        } catch (Exception ignored) {
            return null;
        }
    }
}
