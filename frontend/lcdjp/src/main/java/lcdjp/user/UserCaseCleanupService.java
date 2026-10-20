package lcdjp.user;

import lcdjp.storage.StoredFileCleanupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserCaseCleanupService {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(UserCaseCleanupService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** Optional: removes the purged user's files from object storage once this transaction commits. */
    @Autowired(required = false)
    private StoredFileCleanupService fileCleanup;

    /**
     * Removes all case data and related records for a user in a single transaction.
     * Any failing statement aborts the whole purge and rolls everything back, so a
     * partial purge can never leave orphaned cases, messages or documents behind.
     * The exception propagates to the caller, which must not delete the user row
     * when this method throws.
     *
     * @return the number of cases removed
     */
    @Transactional(rollbackFor = Exception.class)
    public int purgeUserCaseData(String username) {
        List<String> caseRefs = jdbcTemplate.queryForList(
                "SELECT case_reference FROM cases WHERE citizen_id = ?",
                String.class, username);

        // Collect the files before their rows disappear; they are deleted after this transaction commits.
        java.util.Set<String> files = new java.util.LinkedHashSet<>();
        if (fileCleanup != null) {
            for (String caseRef : caseRefs) files.addAll(fileCleanup.caseFiles(caseRef));
            files.addAll(fileCleanup.userContentFiles(username));
        }

        for (String caseRef : caseRefs) {
            if (caseRef == null || caseRef.isBlank()) continue;
            update("DELETE FROM case_messages WHERE case_id = ?", caseRef);
            update("DELETE FROM documents WHERE case_id = ?", caseRef);
            update("DELETE FROM notifications WHERE case_reference = ?", caseRef);
            update("DELETE FROM voice_blobs WHERE case_reference = ?", caseRef);
        }

        int casesRemoved = update("DELETE FROM cases WHERE citizen_id = ?", username);

        update("UPDATE cases SET assigned_lawyer = NULL WHERE assigned_lawyer = ?", username);
        update("UPDATE cases SET selected_lawyer = NULL, selected_lawyer_status = NULL "
                + "WHERE selected_lawyer = ?", username);
        update("UPDATE cases SET assigned_lc = NULL WHERE assigned_lc = ?", username);
        update("UPDATE cases SET assigned_org = NULL WHERE assigned_org = ?", username);
        update("UPDATE cases SET current_handler = NULL, handler_role = NULL "
                + "WHERE current_handler = ?", username);

        update("DELETE FROM notifications WHERE username = ?", username);
        update("DELETE FROM case_messages WHERE from_user = ? OR from_username = ?",
                username, username);
        update("DELETE FROM documents WHERE owner = ?", username);
        update("DELETE FROM chat_messages WHERE from_user = ? OR sent_to = ?",
                username, username);
        update("DELETE FROM voice_blobs WHERE uploader = ? OR recipient = ?", username, username);
        update("DELETE FROM password_reset_tokens WHERE username = ?", username);

        if (fileCleanup != null) fileCleanup.deleteAfterCommit(files);

        return casesRemoved;
    }

    private int update(String sql, Object... args) {
        try {
            return jdbcTemplate.update(sql, args);
        } catch (RuntimeException e) {
            logger.error("User purge failed and will be rolled back [{}]: {}", sql, e.getMessage());
            throw e;
        }
    }
}
