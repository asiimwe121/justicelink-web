package lcdjp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Lets the HttpOnly login cookie stand in for the Authorization header. When a request has no
 * Authorization header but carries the cookie, the request is wrapped so every downstream component
 * (JwtAuthenticationFilter and the controllers that read the header themselves) sees "Bearer &lt;token&gt;".
 * An explicit Authorization header always wins, so existing clients keep working unchanged, except the
 * browser's placeholder "session descriptor" (see {@link #isDescriptor}), which is ignored.
 *
 * CSRF guard: cookies are sent automatically by browsers, so a state-changing request that
 * authenticates by cookie must also carry X-Requested-With, which a cross-site form cannot set.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class CookieAuthFilter extends OncePerRequestFilter {

    static final String CSRF_HEADER = "X-Requested-With";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        // The browser keeps a non-secret "session descriptor" (public claims, signature "cookie-session")
        // for its UI. It is never a credential, so it is treated exactly like no Authorization header.
        boolean descriptor = isDescriptor(header);
        if (header != null && !descriptor) {
            chain.doFilter(request, response);
            return;
        }
        // Sign-in, sign-up and password-reset calls never authenticate by cookie. A leftover login
        // cookie must not make them fail the CSRF check, or a person with an old cookie cannot log in.
        if (isCookieFreePath(request.getRequestURI())) {
            chain.doFilter(descriptor ? new BearerRequest(request, null) : request, response);
            return;
        }
        String token = cookieToken(request);
        if (token == null) {
            chain.doFilter(descriptor ? new BearerRequest(request, null) : request, response);
            return;
        }
        if (isStateChanging(request.getMethod()) && request.getHeader(CSRF_HEADER) == null) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Missing request header\"}");
            return;
        }
        chain.doFilter(new BearerRequest(request, "Bearer " + token), response);
    }

    /** True for "Bearer x.y.cookie-session": the page's placeholder, not a signed token. */
    static boolean isDescriptor(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) return false;
        String value = authorizationHeader.substring(7).trim();
        return value.split("\\.", -1).length == 3 && value.endsWith("." + AuthCookies.DESCRIPTOR_SIGNATURE);
    }

    static String cookieToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (AuthCookies.NAME.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }

    private static final Set<String> COOKIE_FREE_PATHS = Set.of(
            "/api/auth/login", "/api/auth/login/verify-otp", "/api/auth/login/resend-otp",
            "/api/auth/register", "/api/auth/register-pending", "/api/auth/send-otp",
            "/api/auth/verify-otp", "/api/auth/forgot-password", "/api/auth/reset-password",
            "/api/auth/reset-link/validate", "/api/auth/reset-link/confirm",
            "/api/auth/lc-invite/request", "/api/auth/lc-invite/validate", "/api/auth/lc-invite/register");

    /** Public endpoints that establish a session and so never rely on an existing cookie. */
    static boolean isCookieFreePath(String uri) {
        if (uri == null) return false;
        int q = uri.indexOf('?');
        String path = q >= 0 ? uri.substring(0, q) : uri;
        if (path.length() > 1 && path.endsWith("/")) path = path.substring(0, path.length() - 1);
        return COOKIE_FREE_PATHS.contains(path);
    }

    static boolean isStateChanging(String method) {
        return !("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method));
    }

    private static final class BearerRequest extends HttpServletRequestWrapper {
        private final String value;

        BearerRequest(HttpServletRequest request, String value) {
            super(request);
            this.value = value;
        }

        @Override
        public String getHeader(String name) {
            return "Authorization".equalsIgnoreCase(name) ? value : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (!"Authorization".equalsIgnoreCase(name)) return super.getHeaders(name);
            return value == null ? Collections.emptyEnumeration()
                    : Collections.enumeration(Collections.singletonList(value));
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            Set<String> names = new LinkedHashSet<>(Collections.list(super.getHeaderNames()));
            names.removeIf("Authorization"::equalsIgnoreCase);
            if (value != null) names.add("Authorization");
            return Collections.enumeration(names);
        }
    }
}
