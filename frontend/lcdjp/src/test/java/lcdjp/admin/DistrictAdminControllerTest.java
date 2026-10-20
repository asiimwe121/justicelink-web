package lcdjp.admin;

import lcdjp.auth.AccountCreationOtpService;
import lcdjp.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistrictAdminControllerTest {

    @Mock private DistrictAdminRepository districtAdmins;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuditLogService auditLogService;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private AccountCreationOtpService accountCreationOtpService;
    @Mock private HttpServletRequest httpRequest;
    @Mock private DistrictAdminController self;

    @InjectMocks
    private DistrictAdminController controller;

    private void tokenAs(String username, String role, String district) {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer sometoken");
        when(jwtUtil.extractUsername("sometoken")).thenReturn(username);
        when(jwtUtil.extractRole("sometoken")).thenReturn(role);
        when(jwtUtil.extractDistrict("sometoken")).thenReturn(district);
    }

    private void noAuthHeader() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);
    }

    private CreateDistrictAdminRequest validRequest() {
        CreateDistrictAdminRequest r = new CreateDistrictAdminRequest();
        r.setUsername("newdistadmin");
        r.setPassword("StrongPass1");
        r.setFirstName("Jane");
        r.setLastName("Doe");
        r.setEmail("jane@example.com");
        r.setPhone("0700000000");
        r.setDistrict("Kampala");
        return r;
    }

    @Test
    void createDistrictAdmin_noAuthHeader_returns401() {
        noAuthHeader();

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(districtAdmins);
    }

    @Test
    void createDistrictAdmin_nonSystemAdminRole_returns403() {
        tokenAs("bob", "Citizen", null);

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(districtAdmins);
    }

    @Test
    void createDistrictAdmin_adminRoleIsAcceptedAlongsideSystemAdmin() {
        tokenAs("admin1", "admin", null);
        when(accountCreationOtpService.isVerified(eq(httpRequest), eq("DISTRICT_ADMIN"),
                eq("jane@example.com"), eq("0700000000"))).thenReturn(true);
        when(districtAdmins.usernameExists("newdistadmin")).thenReturn(false);
        when(passwordEncoder.encode("StrongPass1")).thenReturn("hashed");

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void createDistrictAdmin_roleCheckIsCaseInsensitive() {
        tokenAs("admin1", "SYSTEM_ADMIN", null);
        when(accountCreationOtpService.isVerified(any(), anyString(), anyString(), anyString())).thenReturn(true);
        when(districtAdmins.usernameExists(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void createDistrictAdmin_blankUsername_returns400WithoutTouchingOtpOrDb() {
        tokenAs("admin1", "system_admin", null);
        CreateDistrictAdminRequest req = validRequest();
        req.setUsername("");

        ResponseEntity<?> result = controller.createDistrictAdmin(req, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(accountCreationOtpService);
        verifyNoInteractions(districtAdmins);
    }

    @Test
    void createDistrictAdmin_usernameUnderEightChars_returns400() {
        tokenAs("admin1", "system_admin", null);
        CreateDistrictAdminRequest req = validRequest();
        req.setUsername("short1");

        ResponseEntity<?> result = controller.createDistrictAdmin(req, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue(((String) body.get("error")).contains("at least 8 characters"));
    }

    @Test
    void createDistrictAdmin_shortPassword_returns400() {
        tokenAs("admin1", "system_admin", null);
        CreateDistrictAdminRequest req = validRequest();
        req.setPassword("short1");

        ResponseEntity<?> result = controller.createDistrictAdmin(req, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void createDistrictAdmin_blankDistrict_returns400() {
        tokenAs("admin1", "system_admin", null);
        CreateDistrictAdminRequest req = validRequest();
        req.setDistrict("");

        ResponseEntity<?> result = controller.createDistrictAdmin(req, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void createDistrictAdmin_contactNotOtpVerified_returns428() {
        tokenAs("admin1", "system_admin", null);
        when(accountCreationOtpService.isVerified(eq(httpRequest), eq("DISTRICT_ADMIN"),
                eq("jane@example.com"), eq("0700000000"))).thenReturn(false);

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, result.getStatusCode());
        verifyNoInteractions(districtAdmins);
    }

    @Test
    void createDistrictAdmin_usernameAlreadyExists_returns409() {
        tokenAs("admin1", "system_admin", null);
        when(accountCreationOtpService.isVerified(any(), anyString(), anyString(), anyString())).thenReturn(true);
        when(districtAdmins.usernameExists("newdistadmin")).thenReturn(true);

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        verify(districtAdmins, never()).insertDistrictAdmin(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void createDistrictAdmin_success_insertsHashedPasswordConsumesOtpAndAudits() {
        tokenAs("sysadmin1", "system_admin", null);
        when(accountCreationOtpService.isVerified(eq(httpRequest), eq("DISTRICT_ADMIN"),
                eq("jane@example.com"), eq("0700000000"))).thenReturn(true);
        when(districtAdmins.usernameExists("newdistadmin")).thenReturn(false);
        when(passwordEncoder.encode("StrongPass1")).thenReturn("hashed-pw");

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("newdistadmin", body.get("username"));
        assertEquals("Kampala", body.get("district"));

        verify(districtAdmins).insertDistrictAdmin("newdistadmin", "hashed-pw", "Jane", "Doe",
                "jane@example.com", "0700000000", "Kampala");
        verify(accountCreationOtpService).consume(httpRequest);
        verify(auditLogService).logAction(eq("sysadmin1"), eq("system_admin"),
                eq("DISTRICT_ADMIN_CREATED"), eq("user"), eq("newdistadmin"), anyString());
    }

    @Test
    void createDistrictAdmin_unexpectedException_returns500() {
        tokenAs("admin1", "system_admin", null);
        when(accountCreationOtpService.isVerified(any(), anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> result = controller.createDistrictAdmin(validRequest(), httpRequest);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    @Test
    void getDistrictAdmins_noAuthHeader_returns401() {
        noAuthHeader();

        ResponseEntity<?> result = controller.getDistrictAdmins(httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getDistrictAdmins_citizenRole_returns403() {
        tokenAs("bob", "Citizen", null);

        ResponseEntity<?> result = controller.getDistrictAdmins(httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(districtAdmins);
    }

    @Test
    void getDistrictAdmins_districtAdminRole_isAllowed() {
        tokenAs("distadmin1", "district_admin", "Kampala");
        when(districtAdmins.findAll()).thenReturn(List.of(Map.of("username", "distadmin1")));

        ResponseEntity<?> result = controller.getDistrictAdmins(httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(1, body.get("count"));
    }

    @Test
    void getDistrictAdmins_systemAdmin_returnsListAndCount() {
        tokenAs("sysadmin1", "system_admin", null);
        List<Map<String, Object>> rows = List.of(Map.of("username", "a"), Map.of("username", "b"));
        when(districtAdmins.findAll())
                .thenReturn(rows);

        ResponseEntity<?> result = controller.getDistrictAdmins(httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(rows, body.get("districtAdmins"));
        assertEquals(2, body.get("count"));
    }

    @Test
    void getDistrictAdminByDistrict_noAuthHeader_returns401() {
        noAuthHeader();

        ResponseEntity<?> result = controller.getDistrictAdminByDistrict("Kampala", httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getDistrictAdminByDistrict_districtAdminRequestingOwnDistrict_isAllowed() {
        tokenAs("distadmin1", "district_admin", "Kampala");
        Map<String, Object> row = Map.of("username", "distadmin1", "district", "Kampala");
        when(districtAdmins.findByDistrict("Kampala")).thenReturn(List.of(row));

        ResponseEntity<?> result = controller.getDistrictAdminByDistrict("Kampala", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(row, body.get("districtAdmin"));
    }

    @Test
    void getDistrictAdminByDistrict_districtAdminRequestingOtherDistrict_returns403() {
        tokenAs("distadmin1", "district_admin", "Kampala");

        ResponseEntity<?> result = controller.getDistrictAdminByDistrict("Wakiso", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(districtAdmins);
    }

    @Test
    void getDistrictAdminByDistrict_systemAdminCanRequestAnyDistrict() {
        tokenAs("sysadmin1", "system_admin", null);
        when(districtAdmins.findByDistrict("Wakiso")).thenReturn(List.of(Map.of("username", "x")));

        ResponseEntity<?> result = controller.getDistrictAdminByDistrict("Wakiso", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getDistrictAdminByDistrict_noneFound_returns404() {
        tokenAs("sysadmin1", "system_admin", null);
        when(districtAdmins.findByDistrict("Nowhere")).thenReturn(List.of());

        ResponseEntity<?> result = controller.getDistrictAdminByDistrict("Nowhere", httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void noDeleteEndpointExistsForDistrictAdmins() {
        boolean hasDeleteMapping = java.util.Arrays.stream(DistrictAdminController.class.getDeclaredMethods())
                .anyMatch(m -> m.isAnnotationPresent(org.springframework.web.bind.annotation.DeleteMapping.class));
        org.junit.jupiter.api.Assertions.assertFalse(hasDeleteMapping,
                "District Admin accounts must be deactivated, never deleted by hand");
    }

    @Test
    void getDistrictAdminStatistics_noAuthHeader_returns401() {
        noAuthHeader();

        ResponseEntity<?> result = controller.getDistrictAdminStatistics(httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getDistrictAdminStatistics_districtAdminRole_isForbidden() {
        tokenAs("distadmin1", "district_admin", "Kampala");

        ResponseEntity<?> result = controller.getDistrictAdminStatistics(httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getDistrictAdminStatistics_systemAdmin_delegatesToSelfAndWrapsResult() {
        tokenAs("sysadmin1", "system_admin", null);
        Map<String, Object> stats = Map.of(
                "totalDistrictAdmins", 4,
                "districtsWithAdmins", 2,
                "districtBreakdown", List.of(Map.of("district", "Kampala", "count", 2)));
        when(self.computeDistrictAdminStatistics()).thenReturn(stats);

        ResponseEntity<?> result = controller.getDistrictAdminStatistics(httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(stats, body.get("statistics"));
        verifyNoInteractions(districtAdmins);
    }

    @Test
    void computeDistrictAdminStatistics_nullCountFromDb_defaultsToZero() {
        when(districtAdmins.count()).thenReturn(0);
        when(districtAdmins.countByDistrict()).thenReturn(List.of());

        Map<String, Object> stats = controller.computeDistrictAdminStatistics();

        assertEquals(0, stats.get("totalDistrictAdmins"));
        assertEquals(0, stats.get("districtsWithAdmins"));
    }
}
