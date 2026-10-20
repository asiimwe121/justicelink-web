package lcdjp.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Stores voice recordings and hands back a short reference ({@code /api/voice/{id}}) to keep in the existing
 * text columns. Each recording has a row in {@code voice_blobs} (who may listen); the audio bytes go to object
 * storage when it is configured ({@code object_key}), otherwise into the row's {@code data} column. An upload
 * that cannot reach the bucket falls back to the row, so an outage never loses a recording.
 * Anything that is not a base64 audio data URI is returned unchanged, so old
 * clients, old rows and already-converted references keep working.
 */
@Service
public class VoiceStorageService {

    private static final Logger log = LoggerFactory.getLogger(VoiceStorageService.class);

    public static final String URL_PREFIX = "/api/voice/";
    /** Decoded size cap. ~60s of opus/AAC voice is well under 1 MB. */
    public static final int MAX_BYTES = 3_000_000;

    private static final Pattern DATA_URI = Pattern.compile(
            "^data:((?:audio/[A-Za-z0-9.+-]+)|video/webm|video/mp4)(?:;[^,]*)?;base64,(.*)$",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    private static final Pattern ANY_DATA_URI = Pattern.compile("^data:[^,]*,", Pattern.CASE_INSENSITIVE);
    private static final Pattern REFERENCE = Pattern.compile("^/api/voice/\\d+$");

    /** Decoded audio plus its mime type. */
    public record Parsed(String mimeType, byte[] bytes) {}

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** Optional so the service still works (MySQL-only) where no storage bean is wired, e.g. in unit tests. */
    @Autowired(required = false)
    private ObjectStorageService objectStorage;

    /**
     * @return a {@code /api/voice/{id}} reference when {@code value} was an audio data URI;
     *         otherwise {@code value} itself.
     * @throws IllegalArgumentException for a data URI that is not valid base64 audio or is too large.
     */
    public String storeIfAudioDataUri(String value, String kind, String uploader,
                                      String recipient, String caseReference) {
        if (value == null || value.isBlank() || REFERENCE.matcher(value).matches()) {
            return value;
        }
        Parsed parsed = parse(value);
        if (parsed == null) {
            return value;
        }
        final String objectKey = uploadToBucket(parsed);
        KeyHolder keys = new GeneratedKeyHolder();
        try {
            jdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO voice_blobs (kind, uploader, recipient, case_reference, mime_type, size_bytes, "
                                + "data, object_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, kind);
                ps.setString(2, uploader);
                ps.setString(3, recipient);
                ps.setString(4, caseReference);
                ps.setString(5, parsed.mimeType());
                ps.setInt(6, parsed.bytes().length);
                if (objectKey == null) {
                    ps.setBytes(7, parsed.bytes());
                    ps.setNull(8, Types.VARCHAR);
                } else {
                    ps.setNull(7, Types.BLOB);
                    ps.setString(8, objectKey);
                }
                return ps;
            }, keys);
        } catch (RuntimeException e) {
            deleteObjectQuietly(objectKey); // the row was not created, so nothing would ever point at the object
            throw e;
        }
        Number id = keys.getKey();
        if (id == null) {
            deleteObjectQuietly(objectKey);
            throw new IllegalStateException("voice_blobs insert returned no id");
        }
        return URL_PREFIX + id.longValue();
    }

    /** @return the object key when the recording was stored in the bucket, or null to keep it in MySQL. */
    private String uploadToBucket(Parsed parsed) {
        if (objectStorage == null || !objectStorage.enabled()) return null;
        LocalDate today = LocalDate.now();
        String key = "voice/" + today.getYear() + "/" + String.format("%02d", today.getMonthValue())
                + "/" + UUID.randomUUID();
        try {
            objectStorage.put(key, parsed.bytes(), parsed.mimeType());
            return key;
        } catch (IOException | RuntimeException e) {
            log.warn("Could not upload voice recording to object storage, keeping it in MySQL: {}", e.getMessage());
            return null;
        }
    }

    private void deleteObjectQuietly(String key) {
        if (key == null || objectStorage == null) return;
        try {
            objectStorage.delete(key);
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete voice object {}: {}", key, e.getMessage());
        }
    }

    /**
     * Ownership/type metadata for a stored recording (no audio bytes).
     * @return the row, or {@code null} when no recording has this id.
     */
    public Map<String, Object> findMetadata(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT kind, uploader, recipient, case_reference, mime_type FROM voice_blobs WHERE id = ?", id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /**
     * The audio bytes of a stored recording; callers must have checked access first.
     * @return the bytes, or null when the recording (or its object) no longer exists.
     * @throws IllegalStateException when the bucket cannot be reached, so a temporary outage is not reported as "gone".
     */
    public byte[] findData(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT object_key, data FROM voice_blobs WHERE id = ?", id);
        if (rows.isEmpty()) return null;
        Object key = rows.get(0).get("object_key");
        if (key != null) {
            if (objectStorage == null) {
                throw new IllegalStateException("Voice recording " + id + " is in object storage, which is not configured");
            }
            try {
                return objectStorage.get(key.toString());
            } catch (IOException e) {
                throw new IllegalStateException("Could not read voice recording " + id + " from object storage", e);
            }
        }
        Object data = rows.get(0).get("data");
        return data instanceof byte[] bytes ? bytes : null;
    }

    /** Deletes a blob this request just created (e.g. its case insert failed). No-op for null/foreign values. */
    public void discard(String reference) {
        if (reference == null || !REFERENCE.matcher(reference).matches()) return;
        try {
            long id = Long.parseLong(reference.substring(URL_PREFIX.length()));
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT object_key FROM voice_blobs WHERE id = ?", id);
            jdbcTemplate.update("DELETE FROM voice_blobs WHERE id = ?", id);
            if (!rows.isEmpty() && rows.get(0).get("object_key") != null) {
                deleteObjectQuietly(rows.get(0).get("object_key").toString());
            }
        } catch (RuntimeException ignored) {
            // Best effort; a leftover object only costs a little storage.
        }
    }

    /**
     * Pure parsing step (no database), kept separate so it can be unit tested.
     * @return null when {@code value} is not a data URI at all (leave it alone).
     */
    static Parsed parse(String value) {
        if (value == null) return null;
        Matcher m = DATA_URI.matcher(value);
        if (!m.matches()) {
            if (ANY_DATA_URI.matcher(value).find()) {
                throw new IllegalArgumentException("Voice data must be audio");
            }
            return null;
        }
        String b64 = m.group(2).replaceAll("\\s", "");
        // Reject before decoding: base64 inflates by 4/3.
        if (b64.length() > (MAX_BYTES / 3 + 1) * 4) {
            throw new IllegalArgumentException("Voice recording is too large");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(b64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Voice data is not valid base64");
        }
        if (bytes.length == 0) {
            throw new IllegalArgumentException("Voice recording is empty");
        }
        if (bytes.length > MAX_BYTES) {
            throw new IllegalArgumentException("Voice recording is too large");
        }
        return new Parsed(m.group(1).toLowerCase(), bytes);
    }
}
