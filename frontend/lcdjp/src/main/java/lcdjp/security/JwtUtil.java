package lcdjp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private Key signingKey;

    @PostConstruct
    private void init() {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /** Session token lifetime; override with JWT_EXPIRATION_MS (default 24 h). */
    private static final long EXPIRATION_TIME = millis("JWT_EXPIRATION_MS", "app.jwt.expiration-ms", 86400000L);
    private static final long PASSWORD_CHANGE_EXPIRATION_TIME = 15L * 60 * 1000;
    private static final String SCOPE_CLAIM = "scope";
    private static final String SCOPE_PASSWORD_CHANGE = "password_change";
    /** "Remember me" token lifetime; override with JWT_REMEMBER_ME_EXPIRATION_MS (default 30 days). */
    private static final long REMEMBER_ME_EXPIRATION_TIME =
            millis("JWT_REMEMBER_ME_EXPIRATION_MS", "app.jwt.remember-me-expiration-ms", 30L * 24 * 60 * 60 * 1000);

    private static long millis(String env, String prop, long fallback) {
        String v = System.getProperty(prop, System.getenv(env));
        if (v == null || v.isBlank()) return fallback;
        try {
            long parsed = Long.parseLong(v.trim());
            return parsed >= 60_000L ? parsed : fallback;
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public Date extractIssuedAt(String token) {
        return extractClaim(token, Claims::getIssuedAt);
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    public String extractDistrict(String token) {
        return extractClaim(token, claims -> claims.get("district", String.class));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(String username, String role, String district) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("district", district);
        return createToken(claims, username, EXPIRATION_TIME);
    }

    public String generateToken(String username, String role, String district, boolean rememberMe) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("district", district);
        return createToken(claims, username, rememberMe ? REMEMBER_ME_EXPIRATION_TIME : EXPIRATION_TIME);
    }

    public String generatePasswordChangeToken(String username, String role, String district) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("district", district);
        claims.put(SCOPE_CLAIM, SCOPE_PASSWORD_CHANGE);
        return createToken(claims, username, PASSWORD_CHANGE_EXPIRATION_TIME);
    }

    public boolean isPasswordChangeToken(String token) {
        try {
            return SCOPE_PASSWORD_CHANGE.equals(extractClaim(token, c -> c.get(SCOPE_CLAIM, String.class)));
        } catch (Exception e) {
            return false;
        }
    }

    private String createToken(Map<String, Object> claims, String subject, long expirationMillis) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(signingKey)
                .compact();
    }

    public Boolean validateToken(String token, String username) {
        try {
            final String extractedUsername = extractUsername(token);
            return username != null
                    && username.equals(extractedUsername)
                    && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    public Boolean validateToken(String token) {
        try {
            String username = extractUsername(token);
            return !isTokenExpired(token) && username != null;
        } catch (Exception e) {
            return false;
        }
    }

    public String generateToken(String username, String role) {
        return generateToken(username, role, "");
    }

    public Date extractExpirationSafely(String token) {
        try {
            return extractExpiration(token);
        } catch (Exception e) {
            return null;
        }
    }
}
