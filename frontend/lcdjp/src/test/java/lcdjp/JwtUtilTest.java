package lcdjp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() throws Exception {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",
                "test-only-secret-key-not-used-anywhere-else-0123456789");
        Method init = JwtUtil.class.getDeclaredMethod("init");
        init.setAccessible(true);
        init.invoke(jwtUtil);
    }

    @Test
    void generateToken_roundTripsUsernameRoleAndDistrict() {
        String token = jwtUtil.generateToken("jdoe", "Admin", "Kampala");

        assertEquals("jdoe", jwtUtil.extractUsername(token));
        assertEquals("Admin", jwtUtil.extractRole(token));
        assertEquals("Kampala", jwtUtil.extractDistrict(token));
    }

    @Test
    void passwordChangeToken_isFlaggedAndNormalTokenIsNot() {
        String restricted = jwtUtil.generatePasswordChangeToken("jdoe", "Admin", "Kampala");
        String normal = jwtUtil.generateToken("jdoe", "Admin", "Kampala");

        assertTrue(jwtUtil.isPasswordChangeToken(restricted));
        assertFalse(jwtUtil.isPasswordChangeToken(normal));
        assertFalse(jwtUtil.isPasswordChangeToken("not.a.jwt"));
        assertEquals("jdoe", jwtUtil.extractUsername(restricted));
        assertTrue(jwtUtil.validateToken(restricted));
    }

    @Test
    void passwordChangeToken_isShortLived() {
        String restricted = jwtUtil.generatePasswordChangeToken("jdoe", "Admin", "Kampala");
        long remaining = jwtUtil.extractExpiration(restricted).getTime() - System.currentTimeMillis();

        assertTrue(remaining <= 15L * 60 * 1000);
    }

    @Test
    void generateToken_withoutDistrict_defaultsToEmptyString() {
        String token = jwtUtil.generateToken("jdoe", "Admin");

        assertEquals("", jwtUtil.extractDistrict(token));
    }

    @Test
    void validateToken_withMatchingUsernameAndFreshToken_isTrue() {
        String token = jwtUtil.generateToken("jdoe", "Admin");

        assertTrue(jwtUtil.validateToken(token, "jdoe"));
    }

    @Test
    void validateToken_withMismatchedUsername_isFalse() {
        String token = jwtUtil.generateToken("jdoe", "Admin");

        assertFalse(jwtUtil.validateToken(token, "someone-else"));
    }

    @Test
    void validateToken_withNullUsername_isFalse() {
        String token = jwtUtil.generateToken("jdoe", "Admin");

        assertFalse(jwtUtil.validateToken(token, null));
    }

    @Test
    void validateToken_singleArgOverload_isTrueForFreshToken() {
        String token = jwtUtil.generateToken("jdoe", "Admin");

        assertTrue(jwtUtil.validateToken(token));
    }

    @Test
    void validateToken_withGarbageToken_isFalseNotThrown() {
        assertFalse(jwtUtil.validateToken("not-a-real-jwt"));
        assertFalse(jwtUtil.validateToken("not-a-real-jwt", "jdoe"));
    }

    @Test
    void extractExpiration_isAfterIssuance() {
        Date before = new Date();
        String token = jwtUtil.generateToken("jdoe", "Admin");

        assertTrue(jwtUtil.extractExpiration(token).after(before));
    }

    @Test
    void extractExpirationSafely_withGarbageToken_returnsNullInsteadOfThrowing() {
        assertNull(jwtUtil.extractExpirationSafely("not-a-real-jwt"));
    }

    @Test
    void extractExpirationSafely_withValidToken_returnsExpiration() {
        String token = jwtUtil.generateToken("jdoe", "Admin");

        assertNotNull(jwtUtil.extractExpirationSafely(token));
    }
}
