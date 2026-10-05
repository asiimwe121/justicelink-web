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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminVerificationControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private UserService userService;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private JwtUtil jwtUtil;
    @Mock private HttpServletRequest httpRequest;

    @InjectMocks
    private AdminVerificationController controller;

    private void tokenAs(String username, String role, String district) {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer sometoken");
        when(jwtUtil.extractUsername("sometoken")).thenReturn(username);
        when(jwtUtil.extractRole("sometoken")).thenReturn(role);
        when(jwtUtil.extractDistrict("sometoken")).thenReturn(district);
    }

    private VerificationDecisionRequest decision(String status, String reason) {
        VerificationDecisionRequest r = new VerificationDecisionRequest();
        r.setStatus(status);
        r.setReason(reason);
        return r;
    }

    @Test
    void getVerificationRequests_noAuthHeader_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);

        ResponseEntity<?> result = controller.getVerificationRequests(httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getVerificationRequests_nonAdminRole_returns403() {
        tokenAs("bob", "Citizen", null);

        ResponseEntity<?> result = controller.getVerificationRequests(httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getVerificationRequests_systemAdmin_queriesAllDistricts() {
        tokenAs("admin1", "system_admin", null);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(Map.of("username", "u1")));

        ResponseEntity<?> result = controller.getVerificationRequests(httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).queryForList(argThat(sql -> !sql.contains("LOWER(TRIM(district))")));
    }

    @Test
    void getVerificationRequests_districtAdminWithNoDistrict_returns403() {
        tokenAs("dadmin", "district_admin", "  ");

        ResponseEntity<?> result = controller.getVerificationRequests(httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getVerificationRequests_districtAdmin_scopesQueryToOwnDistrict() {
        tokenAs("dadmin", "district admin", "Kampala");
        when(jdbcTemplate.queryForList(anyString(), eq("Kampala"))).thenReturn(List.of());

        ResponseEntity<?> result = controller.getVerificationRequests(httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).queryForList(argThat(sql -> sql.contains("district")), eq("Kampala"));
    }

    @Test
    void verifyUser_noAuth_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);

        ResponseEntity<?> result = controller.verifyUser("alice", decision("VERIFIED", null), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(userService, userRepository);
    }

    @Test
    void verifyUser_nonAdminCaller_returns403() {
        tokenAs("bob", "Lawyer", null);

        ResponseEntity<?> result = controller.verifyUser("alice", decision("VERIFIED", null), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(userService);
    }

    @Test
    void verifyUser_systemAdmin_districtHasAssignedAdmin_notOverdue_returns403() {
        tokenAs("root", "system_admin", null);
        User target = new User();
        target.setDistrict("Kampala");
        target.setVerificationSubmittedAt(LocalDateTime.now());
        when(userService.findByUsername("alice")).thenReturn(target);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("Kampala"))).thenReturn(1);

        ResponseEntity<?> result = controller.verifyUser("alice", decision("VERIFIED", null), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyUser_systemAdmin_districtHasAssignedAdmin_but24hOverdue_isAllowedToEscalate() {
        tokenAs("root", "system_admin", null);
        User target = new User();
        target.setDistrict("Kampala");
        target.setVerificationSubmittedAt(LocalDateTime.now().minusHours(48));
        when(userService.findByUsername("alice")).thenReturn(target);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("Kampala"))).thenReturn(1);

        ResponseEntity<?> result = controller.verifyUser("alice", decision("VERIFIED", null), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(userRepository).save(target);
    }

    @Test
    void verifyUser_districtAdmin_wrongDistrict_returns403() {
        tokenAs("dadmin", "district_admin", "Mbarara");
        User target = new User();
        target.setDistrict("Kampala");
        when(userService.findByUsername("alice")).thenReturn(target);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("Kampala"))).thenReturn(0);

        ResponseEntity<?> result = controller.verifyUser("alice", decision("VERIFIED", null), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void verifyUser_districtAdmin_ownDistrict_verifiesAndNotifies() {
        tokenAs("dadmin", "district_admin", "Kampala");
        User target = new User();
        target.setDistrict("Kampala");
        when(userService.findByUsername("alice")).thenReturn(target);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("Kampala"))).thenReturn(1);

        ResponseEntity<?> result = controller.verifyUser("alice", decision("VERIFIED", null), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("VERIFIED", target.getVerificationStatus());
        assertEquals("VERIFIED", target.getVerificationLevel());
        assertEquals("dadmin", target.getVerificationReviewedBy());
        verify(userRepository).save(target);
        verify(notificationService).createNotification(
                eq("alice"), contains("verified"), eq("VERIFICATION_RESULT"),
                eq("admin"), eq("System Admin"), eq("Admin"));
    }

    @Test
    void verifyUser_rejection_setsBasicLevelAndReasonInMessage() {
        tokenAs("root", "system_admin", null);
        User target = new User();
        when(userService.findByUsername("alice")).thenReturn(target);

        controller.verifyUser("alice", decision("REJECTED", "blurry ID photo"), httpRequest);

        assertEquals("REJECTED", target.getVerificationStatus());
        assertEquals("BASIC", target.getVerificationLevel());
        assertEquals("blurry ID photo", target.getVerificationRejectionReason());
        verify(notificationService).createNotification(
                eq("alice"), contains("blurry ID photo"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void getStatistics_success_returnsAggregatedCounts() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(5);

        ResponseEntity<?> result = controller.getStatistics();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(Boolean.TRUE, body.get("success"));
        assertNotNull(body.get("statistics"));
    }

    @Test
    void getStatistics_dbFailure_returns500WithGenericMessage() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class)))
                .thenThrow(new RuntimeException("db down"));

        ResponseEntity<?> result = controller.getStatistics();

        assertEquals(500, result.getStatusCodeValue());
        assertEquals("Could not load statistics. Please try again later.",
                ((Map<?, ?>) result.getBody()).get("error"));
    }

    @Test
    void migrateExistingUsers_reportsUpdatedCount() {
        when(jdbcTemplate.update(anyString())).thenReturn(7);

        ResponseEntity<?> result = controller.migrateExistingUsers();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("Migrated 7 users to VERIFIED", ((Map<?, ?>) result.getBody()).get("message"));
    }
}
