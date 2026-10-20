package lcdjp.notification;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationLookupRepositoryTest {

    @Test
    void findOwner_readsUsernameForTheNotificationId() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject(contains("FROM notifications WHERE id = ?"), eq(String.class), eq(7L)))
                .thenReturn("alice");

        assertEquals("alice", new NotificationLookupRepository(jdbcTemplate).findOwner(7L));
    }
}
