package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LcControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuditLogService auditLogService;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private AccountCreationOtpService accountCreationOtpService;
    @Mock private HttpServletRequest httpRequest;

    @InjectMocks
    private LcController controller;

    private CreateLcAccountRequest validRequest(String district) {
        CreateLcAccountRequest r = new CreateLcAccountRequest();
        r.setUsername("newlcuser");
        r.setPassword("password123");
        r.setFirstName("New");
        r.setLastName("LC");
        r.setEmail("newlc@example.com");
        r.setPhone("+256700000000");
        r.setDistrict(district);
        return r;
    }

    private void tokenAs(String username, String role, String district) {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer sometoken");
        when(jwtUtil.extractUsername("sometoken")).thenReturn(username);
        when(jwtUtil.extractRole("sometoken")).thenReturn(role);
        when(jwtUtil.extractDistrict("sometoken")).thenReturn(district);
    }

    @Test
    void createLcAccount_noToken_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void createLcAccount_callerNotAdminRole_isForbidden() {
        tokenAs("citizen1", "Citizen", null);

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void createLcAccount_districtAdmin_wrongDistrict_isForbidden() {
        tokenAs("district_admin_kla", "DISTRICT_ADMIN", "Kampala");
        when(accountCreationOtpService.isVerified(any(), eq("LC"), anyString(), anyString())).thenReturn(true);

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Wakiso"), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void createLcAccount_districtAdmin_ownDistrict_missingOtpVerification_returns428() {
        tokenAs("district_admin_kla", "DISTRICT_ADMIN", "Kampala");
        when(accountCreationOtpService.isVerified(any(), eq("LC"), anyString(), anyString())).thenReturn(false);

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, result.getStatusCode());
    }

    @Test
    void createLcAccount_districtAdmin_ownDistrict_succeeds() {
        tokenAs("district_admin_kla", "DISTRICT_ADMIN", "Kampala");
        when(accountCreationOtpService.isVerified(any(), eq("LC"), anyString(), anyString())).thenReturn(true);
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*)"), eq(Integer.class), eq("newlcuser")))
                .thenReturn(0);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(contains("INSERT INTO users"), eq("newlcuser"), eq("hashed"),
                eq("New"), eq("LC"), eq("newlc@example.com"), eq("+256700000000"), eq("Kampala"),
                isNull(), isNull(), isNull());
        verify(auditLogService).logAction(eq("district_admin_kla"), eq("DISTRICT_ADMIN"),
                eq("LC_ACCOUNT_CREATED"), eq("user"), eq("newlcuser"), anyString());
    }

    @Test
    void createLcAccount_systemAdmin_existingActiveDistrictAdmin_returns409() {
        tokenAs("system_admin", "SYSTEM_ADMIN", null);
        when(accountCreationOtpService.isVerified(any(), eq("LC"), anyString(), anyString())).thenReturn(true);
        when(jdbcTemplate.queryForList(contains("SELECT username, approval_status, is_active"), eq("Kampala")))
                .thenReturn(List.of(Map.of("username", "district_admin_kla", "approval_status", "Approved", "is_active", true)));

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("INSERT INTO users"), any(Object[].class));
    }

    @Test
    void createLcAccount_systemAdmin_noActiveDistrictAdmin_fallsBackAndSucceeds() {
        tokenAs("system_admin", "SYSTEM_ADMIN", null);
        when(accountCreationOtpService.isVerified(any(), eq("LC"), anyString(), anyString())).thenReturn(true);
        when(jdbcTemplate.queryForList(contains("SELECT username, approval_status, is_active"), eq("Kampala")))
                .thenReturn(List.of());
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*)"), eq(Integer.class), eq("newlcuser")))
                .thenReturn(0);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void createLcAccount_systemAdmin_onlyDisabledDistrictAdminExists_stillTreatsAsFallbackEligible() {
        tokenAs("system_admin", "SYSTEM_ADMIN", null);
        when(accountCreationOtpService.isVerified(any(), eq("LC"), anyString(), anyString())).thenReturn(true);
        when(jdbcTemplate.queryForList(contains("SELECT username, approval_status, is_active"), eq("Kampala")))
                .thenReturn(List.of(Map.of("username", "old_admin", "approval_status", "Disabled", "is_active", true)));
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*)"), eq(Integer.class), eq("newlcuser")))
                .thenReturn(0);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void createLcAccount_usernameAlreadyExists_returns409() {
        tokenAs("system_admin", "SYSTEM_ADMIN", null);
        when(accountCreationOtpService.isVerified(any(), eq("LC"), anyString(), anyString())).thenReturn(true);
        when(jdbcTemplate.queryForList(contains("SELECT username, approval_status, is_active"), eq("Kampala")))
                .thenReturn(List.of());
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*)"), eq(Integer.class), eq("newlcuser")))
                .thenReturn(1);

        ResponseEntity<?> result = controller.createLcAccount(validRequest("Kampala"), httpRequest);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("INSERT INTO users"), any(Object[].class));
    }

    @Test
    void createLcAccount_shortPassword_isBadRequest() {
        tokenAs("district_admin_kla", "DISTRICT_ADMIN", "Kampala");
        CreateLcAccountRequest req = validRequest("Kampala");
        req.setPassword("short");

        ResponseEntity<?> result = controller.createLcAccount(req, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }
}
