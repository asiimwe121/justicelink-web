package lcdjp.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * One-off conversion of pre-V9 base64 voice rows into voice_blobs. OFF by default; enable with
 * {@code voice.backfill.enabled=true}, let it finish once, then turn it off again. Rows are
 * walked by ascending id and converted independently; converted rows no longer start with "data:",
 * so a crash or restart resumes safely. Rows that cannot be converted are left exactly as they were. Back up the database before the first run.
 */
@Component
@org.springframework.core.annotation.Order(1)
public class VoiceBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(VoiceBackfillRunner.class);
    private static final int BATCH = 25;

    @Value("${voice.backfill.enabled:false}")
    private boolean enabled;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private VoiceStorageService storage;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        int chat = convertChat();
        int statements = convertCases("voice_statement", "CASE_STATEMENT");
        int notes = convertCases("voice_note_data", "CASE_NOTE");
        log.info("Voice backfill finished: chat={}, case statements={}, case notes={}", chat, statements, notes);
    }

    private int convertChat() {
        int done = 0;
        long lastId = 0;
        while (true) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT id, from_user, sent_to, audio_data FROM chat_messages "
                            + "WHERE id > ? AND audio_data LIKE 'data:%' ORDER BY id LIMIT " + BATCH, lastId);
            if (rows.isEmpty()) return done;
            for (Map<String, Object> r : rows) {
                lastId = ((Number) r.get("id")).longValue();
                try {
                    String ref = storage.storeIfAudioDataUri((String) r.get("audio_data"), "CHAT",
                            String.valueOf(r.get("from_user")), (String) r.get("sent_to"), null);
                    if (ref != null && ref.startsWith(VoiceStorageService.URL_PREFIX)) {
                        jdbc.update("UPDATE chat_messages SET audio_data = ? WHERE id = ?", ref, lastId);
                        done++;
                    }
                } catch (RuntimeException e) {
                    log.warn("Voice backfill left chat_messages id={} unchanged: {}", lastId, e.getMessage());
                }
            }
        }
    }

    private int convertCases(String column, String kind) {
        int done = 0;
        long lastId = 0;
        while (true) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT case_id, case_reference, citizen_id, " + column + " AS audio FROM cases "
                            + "WHERE case_id > ? AND " + column + " LIKE 'data:%' ORDER BY case_id LIMIT " + BATCH, lastId);
            if (rows.isEmpty()) return done;
            for (Map<String, Object> r : rows) {
                lastId = ((Number) r.get("case_id")).longValue();
                try {
                    String ref = storage.storeIfAudioDataUri((String) r.get("audio"), kind,
                            String.valueOf(r.get("citizen_id")), null, (String) r.get("case_reference"));
                    if (ref != null && ref.startsWith(VoiceStorageService.URL_PREFIX)) {
                        jdbc.update("UPDATE cases SET " + column + " = ? WHERE case_id = ?", ref, lastId);
                        done++;
                    }
                } catch (RuntimeException e) {
                    log.warn("Voice backfill left cases id={} unchanged: {}", lastId, e.getMessage());
                }
            }
        }
    }
}
