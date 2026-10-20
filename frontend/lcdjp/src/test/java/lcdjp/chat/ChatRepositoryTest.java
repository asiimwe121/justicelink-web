package lcdjp.chat;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final ChatRepository repository = new ChatRepository(jdbcTemplate);

    @Test
    void countBasedChecks_treatNullAndZeroAsFalse() {
        when(jdbcTemplate.queryForObject(contains("WHERE username = ?"), eq(Integer.class), eq("a")))
                .thenReturn(1).thenReturn(0).thenReturn(null);

        assertTrue(repository.userExists("a"));
        assertFalse(repository.userExists("a"));
        assertFalse(repository.userExists("a"));
    }

    @Test
    void findUserSummary_isNullWhenThereIsNoUser() {
        when(jdbcTemplate.queryForList(anyString(), eq("ghost"))).thenReturn(List.of());
        Map<String, Object> row = Map.of("username", "bob");
        when(jdbcTemplate.queryForList(anyString(), eq("bob"))).thenReturn(List.of(row));

        assertNull(repository.findUserSummary("ghost"));
        assertSame(row, repository.findUserSummary("bob"));
    }

    @Test
    void findLastRecipient_returnsNullWithoutHistoryOrRecipient() {
        when(jdbcTemplate.queryForList(contains("SELECT sent_to"), eq("a"))).thenReturn(List.of());
        java.util.Map<String, Object> noRecipient = new java.util.HashMap<>();
        noRecipient.put("sent_to", null);
        when(jdbcTemplate.queryForList(contains("SELECT sent_to"), eq("b"))).thenReturn(List.of(noRecipient));
        when(jdbcTemplate.queryForList(contains("SELECT sent_to"), eq("c"))).thenReturn(List.of(Map.of("sent_to", "kampala_admin")));

        assertNull(repository.findLastRecipient("a"));
        assertNull(repository.findLastRecipient("b"));
        assertEquals("kampala_admin", repository.findLastRecipient("c"));
    }

    @Test
    void findDistrictAdminUsername_matchesDistrictIgnoringCaseAndSpaces() {
        when(jdbcTemplate.queryForList(contains("UPPER(TRIM(district)) = UPPER(TRIM(?))"), eq("Kampala")))
                .thenReturn(List.of(Map.of("username", "kampala_admin")));

        assertEquals("kampala_admin", repository.findDistrictAdminUsername("Kampala"));
    }

    @Test
    void findConversation_bindsTheUserTwiceAndTheLimit() {
        repository.findConversation("bob", 50);

        verify(jdbcTemplate).queryForList(contains("from_user = ? OR sent_to = ?"), eq("bob"), eq("bob"), eq(50));
    }

    @Test
    void markAdminRepliesRead_returnsRowsChanged() {
        when(jdbcTemplate.update(contains("from_user = 'admin'"), eq("bob"))).thenReturn(3);

        assertEquals(3, repository.markAdminRepliesRead("bob"));
    }

    @Test
    void reassignThread_movesMessagesToTheNewRecipient() {
        when(jdbcTemplate.update(contains("SET sent_to = ?"), eq("new"), eq("bob"), eq("old"))).thenReturn(2);

        assertEquals(2, repository.reassignThread("bob", "old", "new"));
    }

    @Test
    void insertChatNotification_usesChatTypeAndServerTime() {
        repository.insertChatNotification("admin", "New message", "bob", "Bob B", "Citizen", "hi");

        verify(jdbcTemplate).update(contains("VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"),
                eq("admin"), eq("New message"), eq("chat"), eq("bob"), eq("Bob B"), eq("Citizen"), eq("hi"));
    }
}
