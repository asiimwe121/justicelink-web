package lcdjp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonitoringControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private CacheService cacheService;
    @Mock private ErrorLogger errorLogger;

    @InjectMocks
    private MonitoringController controller;

    @Test
    void getStatus_includesCacheSizeAndRecentErrors() {
        when(cacheService.getSize()).thenReturn(3);
        when(errorLogger.getRecentErrors(10)).thenReturn(List.of(Map.of("msg", "oops")));

        ResponseEntity<?> result = controller.getStatus();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(3, body.get("cacheSize"));
        assertNotNull(body.get("uptime"));
        assertNotNull(body.get("threads"));
    }

    @Test
    void getCacheInfo_returnsCacheSize() {
        when(cacheService.getSize()).thenReturn(7);

        ResponseEntity<?> result = controller.getCacheInfo();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(7, ((Map<?, ?>) result.getBody()).get("cacheSize"));
    }

    @Test
    void clearCache_callsCacheServiceClearAll_andReportsSuccess() {
        ResponseEntity<?> result = controller.clearCache();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(true, ((Map<?, ?>) result.getBody()).get("success"));
        verify(cacheService).clearAll();
    }
}
