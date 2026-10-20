package lcdjp.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class FieldCryptoTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @AfterEach
    void clear() {
        System.clearProperty("app.field-encryption-key");
    }

    @Test
    void roundTripsAndHidesPlaintext() {
        System.setProperty("app.field-encryption-key", KEY);
        String plain = "{\"detaineeName\":\"Test Person\"}";
        String stored = FieldCrypto.encrypt(plain);
        assertTrue(stored.startsWith("enc:v1:"));
        assertFalse(stored.contains("Test Person"));
        assertEquals(plain, FieldCrypto.decrypt(stored));
    }

    @Test
    void sameTextEncryptsDifferentlyEachTime() {
        System.setProperty("app.field-encryption-key", KEY);
        assertNotEquals(FieldCrypto.encrypt("abc"), FieldCrypto.encrypt("abc"));
    }

    @Test
    void plaintextPassesThroughDecrypt() {
        assertEquals("old row", FieldCrypto.decrypt("old row"));
        assertNull(FieldCrypto.decrypt(null));
    }

    @Test
    void withoutKeyTextIsStoredAsIs() {
        assertEquals("abc", FieldCrypto.encrypt("abc"));
    }

    @Test
    void wrongKeyFailsLoudly() {
        System.setProperty("app.field-encryption-key", KEY);
        String stored = FieldCrypto.encrypt("secret");
        byte[] other = new byte[32];
        other[0] = 1;
        System.setProperty("app.field-encryption-key", Base64.getEncoder().encodeToString(other));
        assertThrows(IllegalStateException.class, () -> FieldCrypto.decrypt(stored));
    }
}
