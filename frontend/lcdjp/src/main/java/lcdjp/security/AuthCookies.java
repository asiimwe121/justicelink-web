package lcdjp.security;

import org.springframework.http.ResponseCookie;

import java.time.Duration;
import java.util.Date;

/**
 * The login token also travels in an HttpOnly cookie, so page scripts (and any XSS payload) cannot read it.
 * SameSite=Lax keeps it off cross-site POSTs; {@link CookieAuthFilter} additionally requires an
 * X-Requested-With header on state-changing requests that authenticate by cookie.
 */
public final class AuthCookies {

    public static final String NAME = "lcdjp_auth";
    /** Third segment of the browser's non-secret session descriptor; see CookieAuthFilter.isDescriptor. */
    public static final String DESCRIPTOR_SIGNATURE = "cookie-session";

    private AuthCookies() {
    }

    private static boolean secure() {
        String v = System.getProperty("app.auth-cookie.secure", System.getenv("AUTH_COOKIE_SECURE"));
        return v == null || Boolean.parseBoolean(v);
    }

    /** Set-Cookie value that lasts as long as the token itself. */
    public static String issue(String token, Date expiresAt) {
        long seconds = expiresAt == null ? 86400
                : Math.max(60, (expiresAt.getTime() - System.currentTimeMillis()) / 1000);
        return ResponseCookie.from(NAME, token)
                .httpOnly(true)
                .secure(secure())
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofSeconds(seconds))
                .build()
                .toString();
    }

    /** Set-Cookie value that removes the cookie. */
    public static String clear() {
        return ResponseCookie.from(NAME, "")
                .httpOnly(true)
                .secure(secure())
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ZERO)
                .build()
                .toString();
    }
}
