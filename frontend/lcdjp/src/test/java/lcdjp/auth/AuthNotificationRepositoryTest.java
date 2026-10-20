package lcdjp.auth;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthNotificationRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final AuthNotificationRepository repository = new AuthNotificationRepository(jdbcTemplate);

    @Test
    void findRole_isNullForUnknownUser() {
        when(jdbcTemplate.queryForList(contains("SELECT role"), eq(String.class), eq("ghost"))).thenReturn(List.of());
        when(jdbcTemplate.queryForList(contains("SELECT role"), eq(String.class), eq("bob"))).thenReturn(List.of("Lawyer"));

        assertNull(repository.findRole("ghost"));
        assertEquals("Lawyer", repository.findRole("bob"));
    }

    @Test
    void countUnread_treatsNullAsZero() {
        when(jdbcTemplate.queryForObject(contains("is_read = false"), eq(Integer.class), eq("bob")))
                .thenReturn(null).thenReturn(4);

        assertEquals(0, repository.countUnread("bob"));
        assertEquals(4, repository.countUnread("bob"));
    }

    @Test
    void findLatest_bindsUsernameAndLimit() {
        repository.findLatest("bob", 20);

        verify(jdbcTemplate).queryForList(contains("ORDER BY timestamp DESC LIMIT ?"), eq("bob"), eq(20));
    }

    @Test
    void markReadInAdminInbox_onlyTouchesAdminRows() {
        when(jdbcTemplate.update(contains("username = 'admin'"), eq(7L))).thenReturn(1);

        assertEquals(1, repository.markReadInAdminInbox(7L));
    }

    @Test
    void markReadForUser_comparesUsernameIgnoringCaseAndSpaces() {
        when(jdbcTemplate.update(contains("LOWER(TRIM(username)) = LOWER(TRIM(?))"), eq(5L), eq("Bob "))).thenReturn(1);

        assertEquals(1, repository.markReadForUser(5L, "Bob "));
    }

    @Test
    void findOwnerAndReadFlag_isNullWhenMissing() {
        Map<String, Object> row = new HashMap<>();
        row.put("username", "bob");
        row.put("is_read", true);
        when(jdbcTemplate.queryForList(contains("SELECT username, is_read"), eq(1L))).thenReturn(List.of(row));
        when(jdbcTemplate.queryForList(contains("SELECT username, is_read"), eq(2L))).thenReturn(List.of());

        assertSame(row, repository.findOwnerAndReadFlag(1L));
        assertNull(repository.findOwnerAndReadFlag(2L));
    }

    @Test
    void findDistrictAdminForSupport_returnsFirstUsernameOrNull() {
        when(jdbcTemplate.queryForList(contains("district = ? AND role = 'DISTRICT_ADMIN'"), eq("Kampala")))
                .thenReturn(List.of(Map.of("username", "kla_admin")));
        when(jdbcTemplate.queryForList(contains("district = ? AND role = 'DISTRICT_ADMIN'"), eq("Gulu")))
                .thenReturn(List.of());

        assertEquals("kla_admin", repository.findDistrictAdminForSupport("Kampala"));
        assertNull(repository.findDistrictAdminForSupport("Gulu"));
    }

    @Test
    void insertAdminChatNotification_usesTheCitizenAsSenderAndName() {
        repository.insertAdminChatNotification("admin", "New chat message from bob: hi", "bob");

        verify(jdbcTemplate).update(contains("'CHAT'"), eq("admin"), eq("New chat message from bob: hi"),
                eq("bob"), eq("bob"));
    }
}
