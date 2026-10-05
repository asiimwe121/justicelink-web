package lcdjp;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationControllerTest {

    @Mock private UserService userService;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private VerificationController controller;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, "pw", List.of()));
    }

    @Test
    void requestVerification_noAuthentication_returns401() {
        ResponseEntity<?> result = controller.requestVerification("alice");

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(userService, userRepository, notificationService);
    }

    @Test
    void requestVerification_differentNonAdminUser_returns403() {
        authenticateAs("bob");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("bob")))
                .thenReturn("Lawyer");

        ResponseEntity<?> result = controller.requestVerification("alice");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(userService);
    }

    @Test
    void requestVerification_admin_actingForAnotherUser_isAllowed() {
        authenticateAs("admin1");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("admin1")))
                .thenReturn("System Administrator");
        User target = new User();
        target.setUsername("alice");
        target.setVerificationStatus("UNVERIFIED");
        when(userService.findByUsername("alice")).thenReturn(target);
        when(jdbcTemplate.queryForList(contains("SYSTEM_ADMIN")))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.requestVerification("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(userRepository).save(target);
    }

    @Test
    void requestVerification_alreadyVerified_shortCircuitsWithoutMutating() {
        authenticateAs("alice");
        User user = new User();
        user.setUsername("alice");
        user.setVerificationStatus("VERIFIED");
        when(userService.findByUsername("alice")).thenReturn(user);

        ResponseEntity<?> result = controller.requestVerification("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("Already verified", ((Map<?, ?>) result.getBody()).get("message"));
        verify(userRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void requestVerification_setsPendingStatusAndNotifiesDistrictAdmin() {
        authenticateAs("alice");
        User user = new User();
        user.setUsername("alice");
        user.setDistrict("Kampala");
        user.setVerificationStatus("UNVERIFIED");
        when(userService.findByUsername("alice")).thenReturn(user);
        when(jdbcTemplate.queryForList(contains("DISTRICT_ADMIN"), eq("Kampala")))
                .thenReturn(List.of(Map.of("username", "kampala_admin")));

        ResponseEntity<?> result = controller.requestVerification("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("PENDING", user.getVerificationStatus());
        assertNotNull(user.getVerificationSubmittedAt());
        verify(userRepository).save(user);
        verify(notificationService).createNotification(
                eq("kampala_admin"), contains("alice"), eq("VERIFICATION_REQUEST"),
                eq("system"), eq("System"), eq("System"));
    }

    @Test
    void requestVerification_noDistrictAdmin_fallsBackToSystemAdmin() {
        authenticateAs("alice");
        User user = new User();
        user.setUsername("alice");
        user.setDistrict("Kampala");
        user.setVerificationStatus("UNVERIFIED");
        when(userService.findByUsername("alice")).thenReturn(user);
        when(jdbcTemplate.queryForList(contains("DISTRICT_ADMIN"), eq("Kampala")))
                .thenReturn(List.of());
        when(jdbcTemplate.queryForList(contains("SYSTEM_ADMIN")))
                .thenReturn(List.of(Map.of("username", "root_admin")));

        controller.requestVerification("alice");

        verify(notificationService).createNotification(
                eq("root_admin"), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void requestVerification_noDistrict_noSystemAdminRow_fallsBackToLiteralSystemAdmin() {
        authenticateAs("alice");
        User user = new User();
        user.setUsername("alice");
        user.setVerificationStatus("UNVERIFIED");
        when(userService.findByUsername("alice")).thenReturn(user);
        when(jdbcTemplate.queryForList(contains("SYSTEM_ADMIN")))
                .thenReturn(List.of());

        controller.requestVerification("alice");

        verify(notificationService).createNotification(
                eq("system_admin"), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void getVerificationStatus_owner_returnsStatusAndLevel() {
        authenticateAs("alice");
        User user = new User();
        user.setVerificationStatus("PENDING");
        user.setVerificationLevel("BASIC");
        when(userService.findByUsername("alice")).thenReturn(user);

        ResponseEntity<?> result = controller.getVerificationStatus("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("PENDING", body.get("status"));
        assertEquals("BASIC", body.get("level"));
    }

    @Test
    void getVerificationStatus_notOwnerNotAdmin_returns403() {
        authenticateAs("mallory");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("mallory")))
                .thenReturn("Community Member");

        ResponseEntity<?> result = controller.getVerificationStatus("alice");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(userService);
    }

    @Test
    void uploadDocument_owner_savesEncodedDocumentMap() {
        authenticateAs("alice");
        User user = new User();
        when(userService.findByUsername("alice")).thenReturn(user);

        ResponseEntity<?> result = controller.uploadDocument("alice", "NATIONAL_ID", "base64data");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(user.getVerificationDocuments());
        assertTrue(user.getVerificationDocuments().contains("NATIONAL_ID"));
        verify(userRepository).save(user);
    }

    @Test
    void uploadDocument_notOwnerNotAdmin_returns403_doesNotTouchUser() {
        authenticateAs("mallory");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("mallory")))
                .thenReturn("Lawyer");

        ResponseEntity<?> result = controller.uploadDocument("alice", "NATIONAL_ID", "data");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(userService, userRepository);
    }

    @Test
    void uploadDocument_mergesWithExistingDocumentsJson() throws Exception {
        authenticateAs("alice");
        User user = new User();
        user.setVerificationDocuments("{\"OLD_DOC\":\"olddata\"}");
        when(userService.findByUsername("alice")).thenReturn(user);

        controller.uploadDocument("alice", "NEW_DOC", "newdata");

        assertTrue(user.getVerificationDocuments().contains("OLD_DOC"));
        assertTrue(user.getVerificationDocuments().contains("NEW_DOC"));
    }
}
