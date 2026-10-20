package lcdjp.common;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the client address for rate limiting and audit logging.
 *
 * Without trusted proxy headers the TCP peer address is used. With them, {@code trustedProxyHops} decides which
 * X-Forwarded-For entry is believed: 0 keeps the legacy behaviour (CF-Connecting-IP, then the left-most entry, then
 * X-Real-IP; a client can forge all of these unless the app is only reachable through your proxy), and N >= 1 uses
 * the entry N places from the right, i.e. the address your Nth proxy saw (set it to the number of proxies in front
 * of the app, e.g. 1 for one nginx, 2 for Cloudflare + nginx), which a client cannot forge.
 */
public final class ClientIp {

    private ClientIp() {}

    public static String resolve(HttpServletRequest request, boolean trustProxyHeaders, int trustedProxyHops) {
        if (trustProxyHeaders) {
            String xff = request.getHeader("X-Forwarded-For");
            if (trustedProxyHops >= 1) {
                if (xff != null && !xff.isBlank()) {
                    String[] parts = xff.split(",");
                    int idx = Math.max(0, parts.length - trustedProxyHops);
                    String ip = parts[idx].trim();
                    if (!ip.isEmpty()) return ip;
                }
            } else {
                String cfIp = request.getHeader("CF-Connecting-IP");
                if (cfIp != null && !cfIp.isBlank()) {
                    return cfIp.trim();
                }
                if (xff != null && !xff.isEmpty()) {
                    return xff.split(",")[0].trim();
                }
                String realIp = request.getHeader("X-Real-IP");
                if (realIp != null && !realIp.isEmpty()) {
                    return realIp;
                }
            }
        }
        return request.getRemoteAddr();
    }
}
