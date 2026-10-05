package lcdjp;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final TokenBlacklistService tokenBlacklistService;
    private final SessionRevocationService sessionRevocationService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserService userService, TokenBlacklistService tokenBlacklistService) {
        this(jwtUtil, userService, tokenBlacklistService, null);
    }

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserService userService, TokenBlacklistService tokenBlacklistService,
                                   SessionRevocationService sessionRevocationService) {
        this.jwtUtil = jwtUtil;
        this.userService = userService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.sessionRevocationService = sessionRevocationService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        logger.debug("Processing request: {}", path);

        if (isPublicEndpoint(path, request.getMethod())) {
            logger.debug("Public endpoint, skipping authentication: {}", path);
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String authHeader = request.getHeader("Authorization");
            logger.debug("Authorization header: {}", authHeader != null ? "present" : "missing");

            if (authHeader == null || !authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Authentication required");
                return;
            }

            String token = authHeader.substring(7).trim();
            if (token.isEmpty() || token.split("\\.", -1).length != 3) {
                logger.warn("Malformed JWT for: {}", path);
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid token");
                return;
            }

            if (tokenBlacklistService.isTokenBlacklisted(token)) {
                logger.warn("Token is blacklisted");
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Token has been invalidated");
                return;
            }

            if (!jwtUtil.validateToken(token)) {
                logger.warn("JWT validation failed for: {}", path);
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid or expired token");
                return;
            }

            if (jwtUtil.isPasswordChangeToken(token) && !isPasswordChangeEndpoint(path)) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "You must change your password before continuing");
                return;
            }

            String username = jwtUtil.extractUsername(token);
            logger.debug("Extracted username: {}", username);

            if (username == null || username.isBlank()) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid token");
                return;
            }

            if (sessionRevocationService != null
                    && sessionRevocationService.isRevoked(username, jwtUtil.extractIssuedAt(token))) {
                logger.warn("Token revoked by a password reset for: {}", username);
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Your session has ended. Please log in again.");
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {

                User user = userService.findAuthEssentialsByUsername(username);

                if (user == null) {
                    logger.warn("User not found: {}", username);
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            "User not found");
                    return;
                }

                if (Boolean.FALSE.equals(user.isActive())) {
                    logger.warn("Inactive user attempted access: {}", username);
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Account is disabled");
                    return;
                }

                List<SimpleGrantedAuthority> authorities = normalizedAuthorities(user.getRole());
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(user, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authToken);
                logger.debug("Authentication set for user: {}", username);
            }
        } catch (Exception e) {
            logger.error("Error processing JWT: {}", e.getMessage(), e);

            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Authentication failed");
            return;
        }

        filterChain.doFilter(request, response);
    }
    private boolean isPasswordChangeEndpoint(String path) {
        return path.equals("/api/auth/change-password")
                || path.equals("/api/auth/change-password/resend-otp")
                || path.equals("/api/auth/change-password/verify-otp");
    }

    private boolean isPublicEndpoint(String path, String method) {
        boolean isGet = "GET".equalsIgnoreCase(method);

        return path.equals("/api/auth/login") ||
                path.equals("/api/auth/login/verify-otp") ||
                path.equals("/api/auth/login/resend-otp") ||
                path.equals("/api/auth/register") ||
                path.equals("/api/auth/register-pending") ||
                path.equals("/api/auth/send-otp") ||
                path.equals("/api/auth/verify-otp") ||
                path.equals("/api/auth/forgot-password") ||
                path.equals("/api/auth/reset-password") ||
                path.equals("/api/auth/reset-link/validate") ||
                path.equals("/api/auth/reset-link/confirm") ||
                path.equals("/api/auth/logout") ||
                path.equals("/api/auth/refresh") ||
                path.equals("/api/auth/jwt/validate") ||
                path.equals("/api/auth/verification/submit") ||
                path.equals("/api/auth/recaptcha-config") ||
                path.equals("/api/health") ||

                path.startsWith("/api/ai/") ||
                (isGet && path.startsWith("/api/legal-orgs/")) ||
                (isGet && path.startsWith("/api/legal-alerts/")) ||
                path.startsWith("/api/config/") ||
                path.startsWith("/api/map/") ||
                path.equals("/actuator/health") ||
                path.startsWith("/api-docs/") ||
                path.startsWith("/swagger-ui/") ||
                path.equals("/swagger-ui.html") ||
                path.startsWith("/static/") ||
                path.startsWith("/images/") ||
                path.startsWith("/css/") ||
                path.startsWith("/js/") ||
                path.endsWith(".html") ||
                path.endsWith(".css") ||
                path.endsWith(".js") ||
                path.equals("/") ||
                path.equals("/index.html") ||
                path.equals("/favicon.ico") ||
                path.equals("/manifest.json") ||
                path.equals("/robots.txt") ||
                path.equals("/sitemap.xml");
    }

    private void writeJsonError(HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message.replace("\"", "\\\"") + "\"}");
    }

    private List<SimpleGrantedAuthority> normalizedAuthorities(String role) {
        if (role == null || role.isBlank()) return Collections.emptyList();

        List<String> values = new ArrayList<>();
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        values.add(role);
        values.add(normalized);

        if (normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN") ||
                normalized.equals("SYSTEM_ADMINISTRATOR")) {
            values.add("SYSTEM_ADMIN");
        }

        if (normalized.equals("ADMIN") || normalized.equals("DISTRICT_ADMIN") ||
                normalized.equals("DISTRICT_ADMINISTRATOR")) {
            values.add("DISTRICT_ADMIN");
        }

        return values.stream().distinct()
                .map(SimpleGrantedAuthority::new)
                .toList();
    }
}