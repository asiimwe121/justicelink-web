package lcdjp.maps;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MapLocationRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final MapLocationRepository repository = new MapLocationRepository(jdbcTemplate);

    @Test
    void lcOfficials_blankFiltersAreIgnored() {
        repository.findApprovedLcOfficials(null, " ", "", null);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sql.capture(), any(Object[].class));
        assertTrue(sql.getValue().contains("role = 'LC Official'"));
        assertFalse(sql.getValue().contains("LOWER(TRIM("));
    }

    @Test
    void lcOfficials_givenFiltersAreBoundInOrderAndNeverConcatenated() {
        repository.findApprovedLcOfficials("Kampala", "Makindye", null, "Zone 3'; DROP TABLE users;--");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).queryForList(sql.capture(), params.capture());
        assertTrue(sql.getValue().contains("LOWER(TRIM(district)) = LOWER(TRIM(?))"));
        assertTrue(sql.getValue().contains("LOWER(TRIM(sub_county)) = LOWER(TRIM(?))"));
        assertTrue(sql.getValue().contains("LOWER(TRIM(village)) = LOWER(TRIM(?))"));
        assertFalse(sql.getValue().contains("DROP TABLE"));
        assertArrayEquals(new Object[] {"Kampala", "Makindye", "Zone 3'; DROP TABLE users;--"}, params.getValue());
    }

    @Test
    void lawyers_filterBySpecialization() {
        repository.findApprovedLawyers("Gulu", "Land");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).queryForList(sql.capture(), params.capture());
        assertTrue(sql.getValue().contains("role = 'Lawyer'"));
        assertTrue(sql.getValue().contains("LOWER(TRIM(lawyer_specialization)) = LOWER(TRIM(?))"));
        assertArrayEquals(new Object[] {"Gulu", "Land"}, params.getValue());
    }

    @Test
    void legalAidTableExists_isFalseWhenTheQueryFails() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenThrow(new RuntimeException("no table"));
        assertFalse(repository.legalAidTableExists());
    }

    @Test
    void legalAidTableExists_isTrueWhenTheTableAnswers() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);
        assertTrue(repository.legalAidTableExists());
    }

    @Test
    void legalAidOrganizations_returnsRows() {
        List<Map<String, Object>> rows = List.of(Map.of("org_name", "FIDA"));
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(rows);

        assertEquals(rows, repository.findLegalAidOrganizations("Kampala"));
    }
}
