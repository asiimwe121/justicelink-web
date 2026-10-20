package lcdjp.notification;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Small lookups on the {@code notifications} table used for ownership checks in
 * {@link NotificationController}.
 */
@Repository
public class NotificationLookupRepository {

    private final JdbcTemplate jdbcTemplate;

    public NotificationLookupRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** @return the owning username. Throws (EmptyResultDataAccessException) when the notification does not exist. */
    public String findOwner(Long notificationId) {
        return jdbcTemplate.queryForObject(
                "SELECT username FROM notifications WHERE id = ?", String.class, notificationId);
    }
}
