package lcdjp.admin;

import lcdjp.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistrictMetricsControllerTest {

    @Mock private DistrictMetricsRepository metricsRepository;
    @Mock private JwtUtil jwtUtil;
    @Mock private HttpServletRequest request;

    @InjectMocks
    private DistrictMetricsController controller;

    private static Map<String, Object> row() {
        return Map.of("district", "Gulu", "total", 10L, "open_cases", 4L, "resolved_cases", 6L,
                "escalated_open", 1L, "avg_first_response_min", 90.0, "avg_resolution_min", 600.0);
    }

    @Test
    void missingBearerToken_isUnauthorized() {
        when(request.getHeader("Authorization")).thenReturn(null);

        assertEquals(HttpStatus.UNAUTHORIZED, controller.metrics(request).getStatusCode());
        verifyNoInteractions(metricsRepository);
    }

    @Test
    void unparseableToken_isUnauthorized() {
        when(request.getHeader("Authorization")).thenReturn("Bearer bad");
        when(jwtUtil.extractRole("bad")).thenThrow(new RuntimeException("nope"));

        assertEquals(HttpStatus.UNAUTHORIZED, controller.metrics(request).getStatusCode());
        verifyNoInteractions(metricsRepository);
    }

    @Test
    void nonAdminRole_isForbidden() {
        when(request.getHeader("Authorization")).thenReturn("Bearer t");
        when(jwtUtil.extractRole("t")).thenReturn("CITIZEN");

        assertEquals(HttpStatus.FORBIDDEN, controller.metrics(request).getStatusCode());
        verifyNoInteractions(metricsRepository);
    }

    @Test
    void districtAdminWithoutDistrict_isForbidden() {
        when(request.getHeader("Authorization")).thenReturn("Bearer t");
        when(jwtUtil.extractRole("t")).thenReturn("DISTRICT_ADMIN");
        when(jwtUtil.extractDistrict("t")).thenReturn(" ");

        assertEquals(HttpStatus.FORBIDDEN, controller.metrics(request).getStatusCode());
        verifyNoInteractions(metricsRepository);
    }

    @Test
    void districtAdmin_seesOnlyOwnDistrict() {
        when(request.getHeader("Authorization")).thenReturn("Bearer t");
        when(jwtUtil.extractRole("t")).thenReturn("DISTRICT_ADMIN");
        when(jwtUtil.extractDistrict("t")).thenReturn("Gulu");
        when(metricsRepository.findByDistrict("Gulu")).thenReturn(List.of(row()));

        ResponseEntity<?> result = controller.metrics(request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(metricsRepository, never()).findAllDistricts();
        List<?> districts = (List<?>) ((Map<?, ?>) result.getBody()).get("districts");
        Map<?, ?> gulu = (Map<?, ?>) districts.get(0);
        assertEquals(10L, gulu.get("totalCases"));
        assertEquals(1.5, gulu.get("avgFirstResponseHours"));
        assertEquals(10.0, gulu.get("avgResolutionHours"));
    }

    @Test
    void systemAdmin_seesEveryDistrict() {
        when(request.getHeader("Authorization")).thenReturn("Bearer t");
        when(jwtUtil.extractRole("t")).thenReturn("SYSTEM_ADMIN");
        when(jwtUtil.extractDistrict("t")).thenReturn(null);
        when(metricsRepository.findAllDistricts()).thenReturn(List.of(row()));

        assertEquals(HttpStatus.OK, controller.metrics(request).getStatusCode());
        verify(metricsRepository, never()).findByDistrict(anyString());
    }
}
