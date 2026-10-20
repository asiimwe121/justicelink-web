package lcdjp.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;

    @Value("${app.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;

    @Value("${app.trusted-proxy-hops:0}")
    private int trustedProxyHops;

    /** Per-IP ceiling across all paths, so varying the URL cannot buy a fresh per-path bucket. 0 disables. */
    @Value("${app.rate-limit.global-per-ip-per-minute:0}")
    private int globalPerIpPerMinute;

    public RateLimitingFilter(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.startsWith("/api/ussd") ||
                path.startsWith("/api/auth/health") ||
                path.startsWith("/api/auth/jwt/validate")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        String key = clientIp + ":" + routeKey(path);

        boolean allowed = rateLimiterService.isAllowed(key)
                && (globalPerIpPerMinute <= 0
                || rateLimiterService.isAllowed(clientIp + ":*", globalPerIpPerMinute, 1));
        if (!allowed) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("timestamp", System.currentTimeMillis());
            errorResponse.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
            errorResponse.put("error", "Too Many Requests");
            errorResponse.put("message", "Rate limit exceeded. Please try again later.");
            errorResponse.put("retryAfter", "60 seconds");

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(errorResponse));
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Collapses ids in the path so /api/cases/1 and /api/cases/2 share one bucket instead of each getting a
     * fresh one (which would both dodge the limit and grow the key space without bound).
     */
    static String routeKey(String path) {
        if (path == null || path.isEmpty()) {
            return "/";
        }
        StringBuilder out = new StringBuilder();
        int segments = 0;
        for (String segment : path.split("/")) {
            if (segment.isEmpty()) {
                continue;
            }
            if (++segments > 8) {
                break;
            }
            out.append('/').append(looksLikeId(segment) ? "{id}" : segment);
        }
        return out.length() == 0 ? "/" : out.toString();
    }

    private static boolean looksLikeId(String segment) {
        boolean hasDigit = false;
        boolean allDigits = true;
        for (int i = 0; i < segment.length(); i++) {
            char c = segment.charAt(i);
            if (Character.isDigit(c)) {
                hasDigit = true;
            } else {
                allDigits = false;
            }
        }
        return allDigits || (hasDigit && segment.length() >= 6) || segment.length() > 40;
    }

    private String getClientIp(HttpServletRequest request) {
        return ClientIp.resolve(request, trustProxyHeaders, trustedProxyHops);
    }
}
