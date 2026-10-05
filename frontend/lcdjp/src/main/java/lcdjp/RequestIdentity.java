package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class RequestIdentity {

    public String resolveUsername(HttpServletRequest request) {
        return resolveUsername();
    }

    public String resolveUsername() {
        Authentication authentication = authentication();
        if (authentication == null) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user && hasText(user.getUsername())) {
            return user.getUsername();
        }

        String name = authentication.getName();
        return hasText(name) && !"anonymousUser".equalsIgnoreCase(name) ? name : null;
    }

    public String resolveRole(HttpServletRequest request, String username) {
        return resolveRole();
    }

    public String resolveRole() {
        Authentication authentication = authentication();
        if (authentication == null) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user && hasText(user.getRole())) {
            return user.getRole();
        }

        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(this::hasText)
                .filter(authority -> !authority.startsWith("ROLE_"))
                .findFirst()
                .orElse(null);
    }

    public String resolveDistrict(HttpServletRequest request, String username) {
        return resolveDistrict();
    }

    public String resolveDistrict() {
        Authentication authentication = authentication();
        if (authentication == null) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        return principal instanceof User user ? user.getDistrict() : null;
    }

    private Authentication authentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}