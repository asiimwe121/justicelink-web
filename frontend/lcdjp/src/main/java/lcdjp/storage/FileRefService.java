package lcdjp.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Moves uploaded files out of MySQL into object storage while keeping every existing column and API shape.
 *
 * <ul>
 *   <li>On write, a base64 data URI is uploaded and the column holds a signed reference
 *       ({@code objref:v1:<mime>:<key>:<signature>}) instead of megabytes of text.</li>
 *   <li>On read, {@link FileRefJacksonConfig} swaps any reference found in a JSON response for a short-lived
 *       {@code /api/files/<token>} URL that {@link FileController} serves. Lists stay cheap because nothing is
 *       downloaded until the browser actually opens the file.</li>
 *   <li>Rows that still hold a data URI keep working unchanged, and if the bucket is unreachable at upload time the
 *       data URI is kept in MySQL, so an outage never blocks an upload.</li>
 * </ul>
 * References are HMAC-signed so a user cannot make the API fetch an arbitrary object by typing
 * "objref:..." into a text field.
 */
@Service
public class FileRefService {

    private static final Logger log = LoggerFactory.getLogger(FileRefService.class);

    public static final String REF_PREFIX = "objref:v1:";
    public static final String URL_PREFIX = "/api/files/";
    /** How long a download URL stays valid after the JSON that contained it was produced. */
    static final long URL_TTL_SECONDS = 3600;
    /** Folder for profile pictures; their download URLs live longer (see resolveForClient). */
    public static final String AVATAR_FOLDER = "avatars";
    static final long AVATAR_URL_TTL_SECONDS = 7L * 86400;

    /** Types worth moving. Anything else stays where it was (and is still validated by its own controller). */
    static final Set<String> ALLOWED_MIME = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
            "text/plain",
            "audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave",
            "video/mp4", "video/webm");

    /** Opened inline in the browser; everything else is served as a download. */
    private static final Set<String> INLINE_MIME = Set.of(
            "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
            "audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave", "video/mp4", "video/webm");

    public record Parsed(String mimeType, String key) {}

    public record Download(byte[] bytes, String mimeType, boolean inline) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    private final ObjectStorageService storage;
    private final byte[] secret;

    public FileRefService(ObjectStorageService storage,
                          @Value("${app.storage.url-secret:}") String urlSecret,
                          @Value("${jwt.secret:}") String jwtSecret) {
        this.storage = storage;
        String s = urlSecret != null && !urlSecret.isBlank() ? urlSecret : (jwtSecret == null ? "" : jwtSecret);
        this.secret = ("lcdjp-files|" + s).getBytes(StandardCharsets.UTF_8);
        if (storage.enabled() && s.isBlank()) {
            log.warn("Object storage is configured but no signing secret is available; set STORAGE_URL_SECRET or JWT_SECRET");
        }
    }

    public boolean enabled() {
        return storage.enabled() && secret.length > "lcdjp-files|".length();
    }

    // ---- write side ------------------------------------------------------------------------------------

    /**
     * @return a reference when {@code value} was a base64 data URI of an allowed type and the upload succeeded;
     *         otherwise {@code value} itself, so the caller can store it exactly as it did before.
     */
    public String externalizeIfDataUri(String value, String folder) {
        if (!enabled() || value == null || value.length() < 40) return value;
        if (!value.regionMatches(true, 0, "data:", 0, 5)) return value;
        int comma = value.indexOf(',');
        if (comma < 0) return value;
        String header = value.substring(5, comma).toLowerCase(Locale.ROOT);
        if (!header.endsWith(";base64")) return value;
        String mime = header.substring(0, header.indexOf(';')).trim();
        if (!ALLOWED_MIME.contains(mime)) return value;

        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(value.substring(comma + 1).trim());
        } catch (IllegalArgumentException notBase64) {
            return value;
        }
        if (bytes.length == 0) return value;

        LocalDate today = LocalDate.now();
        String key = folder + "/" + today.getYear() + "/" + String.format("%02d", today.getMonthValue())
                + "/" + UUID.randomUUID();
        try {
            storage.put(key, bytes, mime);
        } catch (IOException | RuntimeException e) {
            log.warn("Could not upload to object storage, keeping the file in MySQL: {}", e.getMessage());
            return value;
        }
        return REF_PREFIX + mime + ":" + key + ":" + refSignature(mime, key);
    }

    /**
     * Same as {@link #externalizeIfDataUri(String, String)}, but a file that shows up twice in one request (the
     * same ID photo in a column and again inside a JSON column) is uploaded once. {@code uploaded} is a
     * scratch map the caller creates per request; it maps the original data URI to its reference.
     */
    public String externalizeIfDataUri(String value, String folder, Map<String, String> uploaded) {
        if (uploaded == null || value == null) return externalizeIfDataUri(value, folder);
        String done = uploaded.get(value);
        if (done != null) return done;
        String result = externalizeIfDataUri(value, folder);
        if (result != null && result != value) uploaded.put(value, result);
        return result;
    }

    /**
     * For a column that holds a JSON object whose values may be data URIs (users.verification_documents):
     * uploads each such value and puts the reference in its place.
     *
     * @return the JSON with references, or {@code json} unchanged when nothing needed moving, storage is off,
     *         or the text is not a JSON object.
     */
    public String externalizeJsonValues(String json, String folder, Map<String, String> uploaded) {
        if (!enabled() || json == null || json.isBlank() || !json.contains("data:")) return json;
        try {
            JsonNode root = JSON.readTree(json);
            if (!(root instanceof ObjectNode obj)) return json;
            List<String> names = new ArrayList<>();
            obj.fieldNames().forEachRemaining(names::add);
            boolean changed = false;
            for (String name : names) {
                JsonNode v = obj.get(name);
                if (v == null || !v.isTextual()) continue;
                String before = v.asText();
                String after = externalizeIfDataUri(before, folder, uploaded);
                if (after != null && !after.equals(before)) {
                    obj.put(name, after);
                    changed = true;
                }
            }
            return changed ? obj.toString() : json;
        } catch (IOException | RuntimeException e) {
            return json;
        }
    }

    /**
     * Every reference stored in a column value: the value itself when it is a reference, or each reference among
     * the string values of a JSON object. Unsigned look-alikes are ignored.
     */
    public Set<String> referencesIn(Object stored) {
        Set<String> found = new LinkedHashSet<>();
        if (!(stored instanceof String s) || s.isEmpty()) return found;
        if (s.startsWith(REF_PREFIX)) {
            if (parseRef(s) != null) found.add(s);
        } else if (s.charAt(0) == '{' && s.contains(REF_PREFIX)) {
            try {
                JsonNode root = JSON.readTree(s);
                root.fields().forEachRemaining(e -> {
                    if (e.getValue().isTextual() && parseRef(e.getValue().asText()) != null) {
                        found.add(e.getValue().asText());
                    }
                });
            } catch (IOException | RuntimeException ignored) {
                // not JSON: nothing to collect
            }
        }
        return found;
    }

    /** True for the download URLs this service hands to the browser. */
    public boolean isFileUrl(String value) {
        return value != null && value.startsWith(URL_PREFIX);
    }

    /** Best-effort removal of the object behind a stored reference; does nothing for anything else. */
    public void deleteQuietly(Object stored) {
        if (!(stored instanceof String s)) return;
        Parsed p = parseRef(s);
        if (p == null || !storage.enabled()) return;
        try {
            storage.delete(p.key());
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete object {}: {}", p.key(), e.getMessage());
        }
    }

    // ---- read side -------------------------------------------------------------------------------------

    /** Used by the JSON serializer: a stored reference becomes a download URL, any other string is unchanged. */
    public String resolveForClient(String value) {
        if (value == null || !value.startsWith(REF_PREFIX)) return value;
        Parsed p = parseRef(value);
        if (p == null) return value;
        long now = System.currentTimeMillis() / 1000;
        long expires;
        if (p.key().startsWith(AVATAR_FOLDER + "/")) {
            // The web app keeps the avatar URL in localStorage, so it must outlive a page visit, and it should be
            // the same URL all day so the browser can reuse the cached picture instead of downloading it again.
            expires = ((now / 86400) + 1) * 86400 + AVATAR_URL_TTL_SECONDS;
        } else {
            expires = now + URL_TTL_SECONDS;
        }
        return URL_PREFIX + createToken(p, expires);
    }

    /**
     * Admin screens preview ID documents from inline data, so for those endpoints a stored reference is turned
     * back into a base64 data URI. Returns null when the file is gone or the bucket cannot be read.
     */
    public String inlineAsDataUri(String value) {
        Parsed p = parseRef(value);
        if (p == null || !storage.enabled()) return value;
        try {
            byte[] bytes = storage.get(p.key());
            if (bytes == null) return null;
            return "data:" + p.mimeType() + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (IOException | RuntimeException e) {
            log.warn("Could not read object {}: {}", p.key(), e.getMessage());
            return null;
        }
    }

    /** {@link #inlineAsDataUri} applied to every reference among the string values of a JSON object. */
    public String inlineJsonRefs(String json) {
        if (json == null || !json.contains(REF_PREFIX)) return json;
        try {
            JsonNode root = JSON.readTree(json);
            if (!(root instanceof ObjectNode obj)) return json;
            List<String> names = new ArrayList<>();
            obj.fieldNames().forEachRemaining(names::add);
            for (String name : names) {
                JsonNode v = obj.get(name);
                if (v != null && v.isTextual() && v.asText().startsWith(REF_PREFIX)) {
                    String inlined = inlineAsDataUri(v.asText());
                    if (inlined == null) obj.putNull(name); else obj.put(name, inlined);
                }
            }
            return obj.toString();
        } catch (IOException | RuntimeException e) {
            return json;
        }
    }

    /** @return the file behind a download token, or null when the token is invalid, expired or the object is gone. */
    public Download open(String token) {
        Parsed p = readToken(token, System.currentTimeMillis() / 1000);
        if (p == null || !storage.enabled()) return null;
        try {
            byte[] bytes = storage.get(p.key());
            if (bytes == null) return null;
            return new Download(bytes, p.mimeType(), INLINE_MIME.contains(p.mimeType()));
        } catch (IOException | RuntimeException e) {
            log.warn("Could not read object {}: {}", p.key(), e.getMessage());
            return null;
        }
    }

    // ---- signing (package-private for tests) ----------------------------------------------------------------

    Parsed parseRef(String stored) {
        if (stored == null || !stored.startsWith(REF_PREFIX)) return null;
        String[] parts = stored.substring(REF_PREFIX.length()).split(":", 3);
        if (parts.length != 3) return null;
        String mime = parts[0];
        String key = parts[1];
        if (!constantTimeEquals(parts[2], refSignature(mime, key))) return null;
        if (!ALLOWED_MIME.contains(mime) || key.contains("..")) return null;
        return new Parsed(mime, key);
    }

    String createToken(Parsed p, long expiresAtEpochSeconds) {
        String payload = b64(p.key() + "|" + p.mimeType() + "|" + expiresAtEpochSeconds);
        return payload + "." + b64(hmac("url\n" + payload));
    }

    Parsed readToken(String token, long nowEpochSeconds) {
        if (token == null) return null;
        int dot = token.indexOf('.');
        if (dot <= 0) return null;
        String payload = token.substring(0, dot);
        if (!constantTimeEquals(token.substring(dot + 1), b64(hmac("url\n" + payload)))) return null;
        String decoded;
        try {
            decoded = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return null;
        }
        String[] parts = decoded.split("\\|");
        if (parts.length != 3) return null;
        try {
            if (Long.parseLong(parts[2]) < nowEpochSeconds) return null;
        } catch (NumberFormatException e) {
            return null;
        }
        if (!ALLOWED_MIME.contains(parts[1]) || parts[0].contains("..")) return null;
        return new Parsed(parts[1], parts[0]);
    }

    private String refSignature(String mime, String key) {
        return b64(hmac("ref\n" + mime + "\n" + key));
    }

    private byte[] hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String b64(String s) {
        return b64(s.getBytes(StandardCharsets.UTF_8));
    }

    private static String b64(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
