package lcdjp.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.KeyHolder;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DocumentRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final DocumentRepository repository = new DocumentRepository(jdbcTemplate);

    @Test
    void insert_returnsTheGeneratedIdAndBindsEveryColumn() throws Exception {
        when(jdbcTemplate.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(inv -> {
            KeyHolder holder = inv.getArgument(1);
            holder.getKeyList().add(Map.of("id", 42L));
            return 1;
        });

        long id = repository.insert("f.pdf", "application/pdf", 1024L, "data", "alice", "CASE-1", "general", "desc");

        assertEquals(42L, id);
        ArgumentCaptor<PreparedStatementCreator> creator = ArgumentCaptor.forClass(PreparedStatementCreator.class);
        verify(jdbcTemplate).update(creator.capture(), any(KeyHolder.class));
        Connection connection = mock(Connection.class);
        PreparedStatement ps = mock(PreparedStatement.class);
        when(connection.prepareStatement(contains("INSERT INTO documents"), eq(Statement.RETURN_GENERATED_KEYS)))
                .thenReturn(ps);
        creator.getValue().createPreparedStatement(connection);
        verify(ps).setString(1, "f.pdf");
        verify(ps).setString(2, "application/pdf");
        verify(ps).setLong(3, 1024L);
        verify(ps).setString(4, "data");
        verify(ps).setString(5, "alice");
        verify(ps).setString(6, "CASE-1");
        verify(ps).setString(7, "general");
        verify(ps).setString(8, "desc");
    }

    @Test
    void insert_withoutAGeneratedKey_returnsZero() {
        assertEquals(0L, repository.insert("f", "t", 1L, "d", "o", null, "general", null));
    }

    @Test
    void findById_isNullWhenMissing() {
        Map<String, Object> row = Map.of("id", 1);
        when(jdbcTemplate.queryForList(contains("FROM documents WHERE id"), eq("1"))).thenReturn(List.of(row));
        when(jdbcTemplate.queryForList(contains("FROM documents WHERE id"), eq("2"))).thenReturn(List.of());

        assertSame(row, repository.findById("1"));
        assertNull(repository.findById("2"));
    }

    @Test
    void findVisibleToUser_bindsUserTwiceAndLimit() {
        repository.findVisibleToUser("alice", 1000);

        verify(jdbcTemplate).queryForList(contains("FIND_IN_SET(?, REPLACE(shared_with, ' ', ''))"),
                eq("alice"), eq("alice"), eq(1000));
    }

    @Test
    void sharingAndDeleting_bindValuesInSqlOrder() {
        when(jdbcTemplate.update(eq("DELETE FROM documents WHERE id = ?"), eq("9"))).thenReturn(1);

        repository.updateSharedWith("9", "bob,carol");

        assertEquals(1, repository.delete("9"));
        verify(jdbcTemplate).update(eq("UPDATE documents SET shared_with = ? WHERE id = ?"), eq("bob,carol"), eq("9"));
    }

    @Test
    void userAndCaseLookups_returnNullWhenMissing() {
        when(jdbcTemplate.queryForList(anyString(), eq("ghost"))).thenReturn(List.of());
        when(jdbcTemplate.queryForList(anyString(), eq("NOPE"))).thenReturn(List.of());

        assertNull(repository.findUserRoleRow("ghost"));
        assertNull(repository.findCaseByReference("NOPE"));
    }
}
