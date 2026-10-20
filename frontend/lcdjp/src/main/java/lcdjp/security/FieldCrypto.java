package lcdjp.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Application-level encryption (AES-256-GCM) for especially sensitive fields, so a leaked database dump
 * or backup does not expose them in readable form.
 *
 * Key: environment variable FIELD_ENCRYPTION_KEY, a base64-encoded 32-byte key
 * (generate with: openssl rand -base64 32). Keep it OUT of the database and OUT of backups;
 * losing it makes encrypted values unrecoverable.
 *
 * Stored form: "enc:v1:" + base64(12-byte IV + ciphertext + tag). Values without that prefix are
 * treated as plaintext, so old rows keep working. If no key is configured, encrypt() returns the
 * text unchanged and logs a warning once, so the app still runs while the key is being set up.
 */
public final class FieldCrypto {

    private static final Logger logger = LoggerFactory.getLogger(FieldCrypto.class);
    static final String PREFIX = "enc:v1:";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static volatile boolean warned = false;

    private FieldCrypto() {
    }

    private static byte[] key() {
        String b64 = System.getProperty("app.field-encryption-key", System.getenv("FIELD_ENCRYPTION_KEY"));
        if (b64 == null || b64.isBlank()) return null;
        try {
            byte[] k = Base64.getDecoder().decode(b64.trim());
            if (k.length != 32) {
                logger.error("FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes (got {})", k.length);
                return null;
            }
            return k;
        } catch (IllegalArgumentException e) {
            logger.error("FIELD_ENCRYPTION_KEY is not valid base64");
            return null;
        }
    }

    public static boolean isConfigured() {
        return key() != null;
    }

    public static String encrypt(String plain) {
        if (plain == null || plain.startsWith(PREFIX)) return plain;
        byte[] k = key();
        if (k == null) {
            if (!warned) {
                warned = true;
                logger.warn("FIELD_ENCRYPTION_KEY is not set: sensitive fields are being stored UNENCRYPTED");
            }
            return plain;
        }
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(k, "AES"), new GCMParameterSpec(128, iv));
            byte[] ct = c.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buf = ByteBuffer.allocate(iv.length + ct.length).put(iv).put(ct);
            return PREFIX + Base64.getEncoder().encodeToString(buf.array());
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /** Plaintext in, plaintext out; "enc:v1:" values are decrypted. Throws if the key is missing or wrong. */
    public static String decrypt(String stored) {
        if (stored == null || !stored.startsWith(PREFIX)) return stored;
        byte[] k = key();
        if (k == null) throw new IllegalStateException("Encrypted value found but FIELD_ENCRYPTION_KEY is not set");
        try {
            byte[] all = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(k, "AES"), new GCMParameterSpec(128, all, 0, 12));
            return new String(c.doFinal(all, 12, all.length - 12), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failed (wrong key or corrupted value)", e);
        }
    }
}
