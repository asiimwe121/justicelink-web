package lcdjp.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Removes the object-storage files that belong to rows being deleted or replaced, so the bucket does not keep
 * files nobody can reach any more.
 *
 * <p>Usage is always the same three steps: collect what the rows point at <em>before</em> deleting them, delete
 * the rows, then call {@link #deleteAfterCommit}. Files are removed only after the database change has
 * committed, so a rolled-back delete never loses a file, and a failure here never fails the request: the worst
 * case is a leftover object, which costs a little storage.</p>
 *
 * <p>Collected items are plain strings: a signed {@code objref:v1:...} reference, or {@code voicekey:<key>} for
 * a voice recording's object. Nothing is collected while object storage is off.</p>
 */
@Service
public class StoredFileCleanupService {

    private static final Logger log = LoggerFactory.getLogger(StoredFileCleanupService.class);
    private static final String VOICE_KEY_PREFIX = "voicekey:";

    /** Selects a column only when it holds a reference, so un-migrated multi-MB data URIs are not pulled in. */
    private static String refOnly(String column) {
        return "CASE WHEN " + column + " LIKE '%objref:v1:%' THEN " + column + " END AS " + column;
    }

    private static final String USER_COLUMNS = String.join(", ",
            refOnly("id_front"), refOnly("id_back"), refOnly("lawyer_work_id"), refOnly("lawyer_certificate"),
            refOnly("lawyer_cv_data"), refOnly("lc_appointment_letter"), refOnly("avatar_data"),
            refOnly("verification_documents"));

    private static final String CASE_COLUMNS = String.join(", ",
            refOnly("attached_file_data"), refOnly("video_statement"),
            refOnly("voice_statement"), refOnly("voice_note_data"));

    private final JdbcTemplate jdbc;
    private final FileRefService files;
    private final ObjectStorageService storage;

    public StoredFileCleanupService(JdbcTemplate jdbc, FileRefService files, ObjectStorageService storage) {
        this.jdbc = jdbc;
        this.files = files;
        this.storage = storage;
    }

    /** Files held by the account row itself: ID photos, certificates, CV, appointment letter, avatar, verification set. */
    public Set<String> userAccountFiles(String username) {
        Set<String> out = new LinkedHashSet<>();
        if (!storage.enabled() || username == null) return out;
        collect(out, jdbc.queryForList("SELECT " + USER_COLUMNS + " FROM users WHERE username = ?", username));
        return out;
    }

    /** Files a user owns outside the account row: documents they uploaded and voice recordings they sent or received. */
    public Set<String> userContentFiles(String username) {
        Set<String> out = new LinkedHashSet<>();
        if (!storage.enabled() || username == null) return out;
        collect(out, jdbc.queryForList("SELECT file_data FROM documents WHERE owner = ? AND file_data LIKE '%objref:v1:%'",
                username));
        voiceKeys(out, "SELECT object_key FROM voice_blobs WHERE (uploader = ? OR recipient = ?) AND object_key IS NOT NULL",
                username, username);
        return out;
    }

    /** Files a case points at: attachment, video, voice note/statement, its documents, and its voice recordings. */
    public Set<String> caseFiles(String caseReference) {
        Set<String> out = new LinkedHashSet<>();
        if (!storage.enabled() || caseReference == null || caseReference.isBlank()) return out;
        collect(out, jdbc.queryForList("SELECT " + CASE_COLUMNS + " FROM cases WHERE case_reference = ?", caseReference));
        collect(out, jdbc.queryForList(
                "SELECT file_data FROM documents WHERE case_id = ? AND file_data LIKE '%objref:v1:%'", caseReference));
        voiceKeys(out, "SELECT object_key FROM voice_blobs WHERE case_reference = ? AND object_key IS NOT NULL",
                caseReference);
        return out;
    }

    /**
     * Second half of deleting a case (the case row itself is deleted by the caller): removes the rows that hang
     * off it - messages, documents, notifications, voice recordings, none of which have a foreign key - and then
     * its files. {@code files} is what {@link #caseFiles} returned <em>before</em> the case was deleted.
     */
    @Transactional(rollbackFor = Exception.class)
    public void purgeCaseDependents(String caseReference, Set<String> files) {
        if (caseReference != null && !caseReference.isBlank()) {
            jdbc.update("DELETE FROM case_messages WHERE case_id = ?", caseReference);
            jdbc.update("DELETE FROM documents WHERE case_id = ?", caseReference);
            jdbc.update("DELETE FROM notifications WHERE case_reference = ?", caseReference);
            jdbc.update("DELETE FROM voice_blobs WHERE case_reference = ?", caseReference);
        }
        deleteAfterCommit(files);
    }

    /** Everything in {@code before} that {@code after} no longer holds, e.g. a replaced avatar or ID photo. */
    public Set<String> dropped(Set<String> before, Set<String> after) {
        Set<String> gone = new LinkedHashSet<>(before);
        gone.removeAll(after);
        return gone;
    }

    /** Deletes the collected files once the surrounding transaction commits (immediately when there is none). */
    public void deleteAfterCommit(Set<String> items) {
        if (items == null || items.isEmpty() || !storage.enabled()) return;
        Set<String> copy = new LinkedHashSet<>(items);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteNow(copy);
                }
            });
        } else {
            deleteNow(copy);
        }
    }

    private void deleteNow(Set<String> items) {
        for (String item : items) {
            try {
                if (item.startsWith(VOICE_KEY_PREFIX)) {
                    storage.delete(item.substring(VOICE_KEY_PREFIX.length()));
                } else {
                    files.deleteQuietly(item);
                }
            } catch (IOException | RuntimeException e) {
                log.warn("Could not delete stored file: {}", e.getMessage());
            }
        }
    }

    private void collect(Set<String> out, List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            for (Object value : row.values()) {
                out.addAll(files.referencesIn(value));
            }
        }
    }

    private void voiceKeys(Set<String> out, String sql, Object... args) {
        for (Map<String, Object> row : jdbc.queryForList(sql, args)) {
            Object key = row.get("object_key");
            if (key != null) out.add(VOICE_KEY_PREFIX + key);
        }
    }
}
