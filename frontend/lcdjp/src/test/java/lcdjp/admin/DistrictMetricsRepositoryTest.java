package lcdjp.admin;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistrictMetricsRepositoryTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private DistrictMetricsRepository repository;

    @Test
    void findAllDistricts_runsUnfilteredQuery() {
        List<Map<String, Object>> rows = List.of(Map.of("district", "Gulu"));
        when(jdbcTemplate.queryForList(anyString())).thenReturn(rows);

        assertSame(rows, repository.findAllDistricts());

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sql.capture());
        assertTrue(sql.getValue().contains("FROM cases WHERE district IS NOT NULL GROUP BY district ORDER BY district"));
        assertFalse(sql.getValue().contains("LOWER(?)"));
    }

    @Test
    void findByDistrict_filtersCaseInsensitivelyWithBoundParameter() {
        List<Map<String, Object>> rows = List.of(Map.of("district", "Gulu"));
        when(jdbcTemplate.queryForList(anyString(), eq("gulu"))).thenReturn(rows);

        assertSame(rows, repository.findByDistrict("gulu"));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sql.capture(), eq("gulu"));
        assertTrue(sql.getValue().contains("AND LOWER(district) = LOWER(?) GROUP BY district ORDER BY district"));
    }
}
