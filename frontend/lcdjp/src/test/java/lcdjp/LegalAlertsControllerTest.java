package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LegalAlertsControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AuditLogService auditLogService;
    @Mock private JwtUtil jwtUtil;
    @Mock private HttpServletRequest httpRequest;

    private LegalAlertsController controller;

    private void inject() {
        controller = new LegalAlertsController();
        ReflectionTestUtils.setField(controller, "jdbcTemplate", jdbcTemplate);
        ReflectionTestUtils.setField(controller, "auditLogService", auditLogService);
        ReflectionTestUtils.setField(controller, "jwtUtil", jwtUtil);
    }

    private void asDistrictAdmin() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer tok");
        when(jwtUtil.validateToken("tok")).thenReturn(true);
        when(jwtUtil.extractRole("tok")).thenReturn("District Admin");
    }

    private void asNonDistrictAdmin() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);
    }

    private LegalAlertCreateRequest createRequest(String title) {
        LegalAlertCreateRequest r = new LegalAlertCreateRequest();
        r.setTitle(title);
        return r;
    }

    @Test
    void getAllAlerts_districtAdmin_returns403() {
        inject();
        asDistrictAdmin();

        ResponseEntity<?> result = controller.getAllAlerts(null, httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void createAlert_districtAdmin_returns403() {
        inject();
        asDistrictAdmin();

        ResponseEntity<?> result = controller.createAlert(createRequest("Notice"), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void deleteAlert_districtAdmin_returns403() {
        inject();
        asDistrictAdmin();

        ResponseEntity<?> result = controller.deleteAlert(1L, httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getAlertById_districtAdmin_returns403() {
        inject();
        asDistrictAdmin();

        ResponseEntity<?> result = controller.getAlertById(1L, httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void updateAlert_districtAdmin_returns403() {
        inject();
        asDistrictAdmin();

        ResponseEntity<?> result = controller.updateAlert(1L, new LegalAlertUpdateRequest(), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getAllAlerts_noCategory_returnsAll() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", 1)));

        ResponseEntity<?> result = controller.getAllAlerts(null, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).queryForList(argThat(sql -> !sql.contains("AND category")), any(Object[].class));
    }

    @Test
    void getAllAlerts_withCategory_filtersByCategory() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());

        controller.getAllAlerts("Housing", httpRequest);

        verify(jdbcTemplate).queryForList(argThat(sql -> sql.contains("AND category")), eq(new Object[]{"Housing"}));
    }

    @Test
    void getAllAlerts_dbError_returns500() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> result = controller.getAllAlerts(null, httpRequest);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    @Test
    void createAlert_emptyTitle_returns400() {
        inject();
        asNonDistrictAdmin();

        ResponseEntity<?> result = controller.createAlert(createRequest(""), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void createAlert_invalidPriorityAndAudience_fallBackToDefaults() {
        inject();
        asNonDistrictAdmin();
        LegalAlertCreateRequest req = createRequest("Notice");
        req.setPriority("critical!!");
        req.setAudience("everyone");
        when(jdbcTemplate.queryForObject(eq("SELECT LAST_INSERT_ID()"), eq(Long.class))).thenReturn(42L);

        ResponseEntity<?> result = controller.createAlert(req, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(anyString(), eq("Notice"), eq(""), eq("General"),
                eq("medium"), eq("all"), eq("admin"));
    }

    @Test
    void createAlert_neverTrustsCallerSuppliedIdentity_alwaysUsesAdmin() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.queryForObject(eq("SELECT LAST_INSERT_ID()"), eq(Long.class))).thenReturn(1L);

        controller.createAlert(createRequest("Notice"), httpRequest);

        verify(jdbcTemplate).update(anyString(), anyString(), anyString(), anyString(), anyString(),
                anyString(), eq("admin"));
        verify(auditLogService).logAction(eq("admin"), anyString(), eq("ALERT_CREATED"),
                anyString(), eq("1"), anyString());
    }

    @Test
    void createAlert_dbError_returns500() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> result = controller.createAlert(createRequest("Notice"), httpRequest);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    @Test
    void deleteAlert_notFound_returns404() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.update(anyString(), eq(1L))).thenReturn(0);

        ResponseEntity<?> result = controller.deleteAlert(1L, httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void deleteAlert_found_softDeletesAndLogsAudit() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.update(anyString(), eq(5L))).thenReturn(1);

        ResponseEntity<?> result = controller.deleteAlert(5L, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(eq("admin"), anyString(), eq("ALERT_DELETED"),
                anyString(), eq("5"), anyString());
    }

    @Test
    void getAlertById_notFound_returns404() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.queryForList(anyString(), eq(9L))).thenReturn(List.of());

        ResponseEntity<?> result = controller.getAlertById(9L, httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void getAlertById_found_returnsAlert() {
        inject();
        asNonDistrictAdmin();
        when(jdbcTemplate.queryForList(anyString(), eq(9L))).thenReturn(List.of(Map.of("id", 9L)));

        ResponseEntity<?> result = controller.getAlertById(9L, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void updateAlert_noFieldsSet_returns400() {
        inject();
        asNonDistrictAdmin();

        ResponseEntity<?> result = controller.updateAlert(1L, new LegalAlertUpdateRequest(), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void updateAlert_notFound_returns404() {
        inject();
        asNonDistrictAdmin();
        LegalAlertUpdateRequest req = new LegalAlertUpdateRequest();
        req.setTitle("New title");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);

        ResponseEntity<?> result = controller.updateAlert(1L, req, httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void updateAlert_isActiveFalse_mapsToZero() {
        inject();
        asNonDistrictAdmin();
        LegalAlertUpdateRequest req = new LegalAlertUpdateRequest();
        req.setIsActive(false);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        ResponseEntity<?> result = controller.updateAlert(1L, req, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(anyString(), eq(0), eq(1L));
    }
}
