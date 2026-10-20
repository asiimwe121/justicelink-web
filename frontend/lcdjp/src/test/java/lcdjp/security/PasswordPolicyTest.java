package lcdjp.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordPolicyTest {

    @AfterEach
    void clear() {
        System.clearProperty("app.password.min-length");
    }

    @Test
    void defaultsToEight() {
        assertEquals(8, PasswordPolicy.minLength());
        assertTrue(PasswordPolicy.tooShort("1234567"));
        assertFalse(PasswordPolicy.tooShort("12345678"));
        assertTrue(PasswordPolicy.tooShort(null));
    }

    @Test
    void canBeRaisedButNotLowered() {
        System.setProperty("app.password.min-length", "12");
        assertEquals(12, PasswordPolicy.minLength());
        assertEquals("Password must be at least 12 characters", PasswordPolicy.message());

        System.setProperty("app.password.min-length", "4");
        assertEquals(8, PasswordPolicy.minLength());

        System.setProperty("app.password.min-length", "abc");
        assertEquals(8, PasswordPolicy.minLength());
    }
}
