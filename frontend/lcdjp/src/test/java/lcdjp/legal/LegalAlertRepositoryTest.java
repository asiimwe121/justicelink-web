package lcdjp.legal;

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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class LegalAlertRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final LegalAlertRepository repository = new LegalAlertRepository(jdbcTemplate);

    @Test
    void findActive_withoutCategory_hasNoCategoryFilter() {
        repository.findActive(null);
        repository.findActive("");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate, times(2)).queryForList(sql.capture());
        sql.getAllValues().forEach(s -> {
            assertFalse(s.contains("AND category"));
            assertTrue(s.endsWith("ORDER BY created_at DESC LIMIT 100"));
        });
    }

    @Test
    void findActive_withCategory_bindsItAsAParameter() {
        List<Map<String, Object>> rows = List.of(Map.of("id", 1));
        when(jdbcTemplate.queryForList(contains0("AND category = ?"), eq("Housing"))).thenReturn(rows);

        assertEquals(rows, repository.findActive("Housing"));
    }

    private static String contains0(String part) {
        return org.mockito.ArgumentMatchers.contains(part);
    }

    @Test
    void insert_returnsTheGeneratedKeyFromTheSameStatement() throws Exception {
        when(jdbcTemplate.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(inv -> {
            KeyHolder holder = inv.getArgument(1);
            holder.getKeyList().add(Map.of("GENERATED_KEY", 42L));
            return 1;
        });

        assertEquals(42L, repository.insert("T", "C", "General", "medium", "all", "admin"));

        ArgumentCaptor<PreparedStatementCreator> creator = ArgumentCaptor.forClass(PreparedStatementCreator.class);
        verify(jdbcTemplate).update(creator.capture(), any(KeyHolder.class));
        Connection connection = mock(Connection.class);
        PreparedStatement ps = mock(PreparedStatement.class);
        when(connection.prepareStatement(anyString(), eq(Statement.RETURN_GENERATED_KEYS))).thenReturn(ps);
        creator.getValue().createPreparedStatement(connection);
        verify(ps).setString(1, "T");
        verify(ps).setString(2, "C");
        verify(ps).setString(3, "General");
        verify(ps).setString(4, "medium");
        verify(ps).setString(5, "all");
        verify(ps).setString(6, "admin");
    }

    @Test
    void insert_withoutAGeneratedKey_returnsNull() {
        assertNull(repository.insert("T", "C", "General", "medium", "all", "admin"));
    }

    @Test
    void deactivate_isASoftDelete() {
        when(jdbcTemplate.update(anyString(), eq(5L))).thenReturn(1);

        assertEquals(1, repository.deactivate(5L));
        verify(jdbcTemplate).update(eq("UPDATE legal_alerts SET is_active = FALSE WHERE id = ?"), eq(5L));
    }

    @Test
    void update_setsOnlyGivenFieldsAndMapsActiveToOneOrZero() {
        repository.update(7L, "New", null, null, false);

        verify(jdbcTemplate).update(eq("UPDATE legal_alerts SET title = ?, is_active = ? WHERE id = ?"),
                eq("New"), eq(0), eq(7L));
    }

    @Test
    void update_withNothingToChange_isRejected() {
        assertThrows(IllegalArgumentException.class, () -> repository.update(7L, null, null, null, null));
        verifyNoInteractions(jdbcTemplate);
    }
}
