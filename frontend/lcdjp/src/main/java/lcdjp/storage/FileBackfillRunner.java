package lcdjp.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * One-off move of files already stored as base64 text in MySQL into object storage, which is what actually frees
 * disk space. OFF by default; set {@code STORAGE_BACKFILL_ENABLED=true}, restart, wait for the "finished" log
 * line, then turn it off again. Rows are walked by ascending id and converted one at a time: the file is
 * uploaded first, the column is switched to the reference second, and a row that cannot be converted
 * (bucket unreachable, unsupported type) is left exactly as it was, so a crash or restart resumes safely.
 * Back up the database before the first run. Afterwards run
 * {@code OPTIMIZE TABLE documents, cases, users, voice_blobs;} so MySQL hands the freed space back to the disk.
 *
 * <p>Also moves the account files in {@code users} (ID photos, certificates, CV, appointment letter, avatar,
 * verification documents) and the audio bytes in {@code voice_blobs}. Runs after the voice backfill, which
 * first turns old base64 voice columns into {@code voice_blobs} rows.</p>
 */
@Component
@Order(2)
public class FileBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FileBackfillRunner.class);
    private static final int BATCH = 5; // rows can be several MB each

    @Value("${app.storage.backfill.enabled:false}")
    private boolean enabled;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private FileRefService fileRefService;

    @Autowired
    private ObjectStorageService objectStorage;

    /** users columns that hold one file each; verification_documents holds several inside JSON. */
    private static final List<String> USER_FILE_COLUMNS = List.of(
            "id_front", "id_back", "lawyer_work_id", "lawyer_certificate", "lawyer_cv_data",
            "lc_appointment_letter", "avatar_data");

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        if (!fileRefService.enabled()) {
            log.warn("File backfill requested but object storage is not configured; nothing done");
            return;
        }
        int documents = convert("documents", "id", "file_data", "documents");
        int attachments = convert("cases", "case_id", "attached_file_data", "cases");
        int videos = convert("cases", "case_id", "video_statement", "cases");
        int accounts = convertUsers();
        int voices = convertVoiceBlobs();
        log.info("File backfill finished: documents={}, case attachments={}, case videos={}, "
                        + "account files={}, voice recordings={}",
                documents, attachments, videos, accounts, voices);
    }

    /**
     * Account files, one user at a time so the same photo stored in a column and again inside
     * verification_documents is uploaded once. Each column is switched only if it still holds the data URI
     * that was uploaded, so a user editing their profile during the run is never overwritten.
     */
    private int convertUsers() {
        StringBuilder any = new StringBuilder("verification_documents LIKE '%data:%'");
        for (String c : USER_FILE_COLUMNS) any.append(" OR ").append(c).append(" LIKE 'data:%'");
        String select = "SELECT user_id, " + String.join(", ", USER_FILE_COLUMNS) + ", verification_documents FROM users "
                + "WHERE user_id > ? AND (" + any + ") ORDER BY user_id LIMIT 3";
        int files = 0;
        long lastId = 0;
        while (true) {
            List<Map<String, Object>> rows = jdbc.queryForList(select, lastId);
            if (rows.isEmpty()) {
                log.info("File backfill users: files converted={}", files);
                return files;
            }
            for (Map<String, Object> r : rows) {
                lastId = ((Number) r.get("user_id")).longValue();
                Map<String, String> uploaded = new HashMap<>();
                try {
                    for (String column : USER_FILE_COLUMNS) {
                        String original = (String) r.get(column);
                        String ref = fileRefService.externalizeIfDataUri(original, "users", uploaded);
                        if (ref != null && ref.startsWith(FileRefService.REF_PREFIX)
                                && jdbc.update("UPDATE users SET " + column + " = ? WHERE user_id = ? AND " + column
                                + " = ?", ref, lastId, original) > 0) {
                            files++;
                        }
                    }
                    String json = (String) r.get("verification_documents");
                    String newJson = fileRefService.externalizeJsonValues(json, "users", uploaded);
                    if (newJson != null && !newJson.equals(json)
                            && jdbc.update("UPDATE users SET verification_documents = ? WHERE user_id = ? "
                            + "AND verification_documents = ?", newJson, lastId, json) > 0) {
                        files++;
                    }
                } catch (RuntimeException e) {
                    log.warn("File backfill left users user_id={} partly unchanged: {}", lastId, e.getMessage());
                }
            }
        }
    }

    /** Voice recordings whose bytes are still in MySQL move to the bucket; the row keeps its access rules. */
    private int convertVoiceBlobs() {
        int done = 0;
        long lastId = 0;
        while (true) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT id, mime_type FROM voice_blobs WHERE id > ? AND object_key IS NULL AND data IS NOT NULL "
                            + "ORDER BY id LIMIT " + BATCH, lastId);
            if (rows.isEmpty()) {
                log.info("File backfill voice_blobs: converted={}", done);
                return done;
            }
            for (Map<String, Object> r : rows) {
                lastId = ((Number) r.get("id")).longValue();
                String key = "voice/backfill/" + lastId + "-" + java.util.UUID.randomUUID();
                try {
                    byte[] bytes = jdbc.queryForObject("SELECT data FROM voice_blobs WHERE id = ?", byte[].class, lastId);
                    if (bytes == null || bytes.length == 0) continue;
                    objectStorage.put(key, bytes, String.valueOf(r.get("mime_type")));
                    int n = jdbc.update("UPDATE voice_blobs SET object_key = ?, data = NULL "
                            + "WHERE id = ? AND object_key IS NULL", key, lastId);
                    if (n == 0) {
                        objectStorage.delete(key);
                    } else {
                        done++;
                    }
                } catch (IOException | RuntimeException e) {
                    log.warn("File backfill left voice_blobs id={} unchanged: {}", lastId, e.getMessage());
                }
            }
        }
    }

    /** Table, id column and data column names are fixed constants above, never user input. */
    private int convert(String table, String idColumn, String column, String folder) {
        int done = 0;
        int skipped = 0;
        long lastId = 0;
        while (true) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT " + idColumn + " AS rid, " + column + " AS val FROM " + table
                            + " WHERE " + idColumn + " > ? AND " + column + " LIKE 'data:%' ORDER BY "
                            + idColumn + " LIMIT " + BATCH, lastId);
            if (rows.isEmpty()) {
                log.info("File backfill {}.{}: converted={}, left unchanged={}", table, column, done, skipped);
                return done;
            }
            for (Map<String, Object> r : rows) {
                lastId = ((Number) r.get("rid")).longValue();
                try {
                    String ref = fileRefService.externalizeIfDataUri((String) r.get("val"), folder);
                    if (ref != null && ref.startsWith(FileRefService.REF_PREFIX)) {
                        int n = jdbc.update("UPDATE " + table + " SET " + column + " = ? WHERE " + idColumn
                                + " = ? AND " + column + " LIKE 'data:%'", ref, lastId);
                        if (n == 0) {
                            fileRefService.deleteQuietly(ref); // row changed or vanished meanwhile
                        } else {
                            done++;
                        }
                    } else {
                        skipped++;
                    }
                } catch (RuntimeException e) {
                    skipped++;
                    log.warn("File backfill left {}.{} id={} unchanged: {}", table, column, lastId, e.getMessage());
                }
            }
        }
    }
}
