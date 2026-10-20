package lcdjp.admin;

import lcdjp.security.RequestIdentity;
import lcdjp.verification.VerificationDecisionRequest;
import lcdjp.verification.VerificationDecisionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserVerificationControllerTest {

    @Mock private AdminUserRepository adminUsers;
    @Mock private RequestIdentity requestIdentity;
    @Mock private VerificationDecisionService verificationDecisionService;
    @Mock private HttpServletRequest httpRequest;

    @InjectMocks
    private AdminUserVerificationController controller;

    private void identityAs(String username, String role, String district) {
        lenient().when(requestIdentity.resolveUsername(httpRequest)).thenReturn(username);
        lenient().when(requestIdentity.resolveRole(httpRequest, username)).thenReturn(role);
        lenient().when(requestIdentity.resolveDistrict(httpRequest, username)).thenReturn(district);
    }

    private void unauthenticated() {
        when(requestIdentity.resolveUsername(httpRequest)).thenReturn(null);
    }

    @Test
    void approveVerification_nonAdmin_returns403() {
        identityAs("citizen1", "Citizen", null);

        ResponseEntity<?> result = controller.approveVerification("jdoe", Map.of(), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(verificationDecisionService);
    }

    @Test
    void approveVerification_systemAdmin_delegatesToVerificationDecisionService() {
        identityAs("sysadmin", "SYSTEM_ADMIN", "Kampala");
        ResponseEntity<Object> expected = ResponseEntity.ok(Map.of("success", true));
        doReturn(expected).when(verificationDecisionService)
                .approve("sysadmin", "SYSTEM_ADMIN", "Kampala", "jdoe");

        ResponseEntity<?> result = controller.approveVerification("jdoe", Map.of(), httpRequest);

        assertSame(expected, result);
    }

    @Test
    void rejectVerification_districtAdmin_delegatesWithReason() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        VerificationDecisionRequest request = new VerificationDecisionRequest();
        request.setReason("Documents illegible");
        ResponseEntity<Object> expected = ResponseEntity.ok(Map.of("success", true));
        doReturn(expected).when(verificationDecisionService)
                .reject("distadmin", "DISTRICT_ADMIN", "Kampala", "jdoe", "Documents illegible");

        ResponseEntity<?> result = controller.rejectVerification("jdoe", request, httpRequest);

        assertSame(expected, result);
    }

    @Test
    void rejectVerification_noAuth_returns401() {
        unauthenticated();

        ResponseEntity<?> result = controller.rejectVerification("jdoe", new VerificationDecisionRequest(), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(verificationDecisionService);
    }

    @Test
    void getVerificationStatus_invalidUsername_returns400() {
        ResponseEntity<?> result = controller.getVerificationStatus("undefined", httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(requestIdentity);
    }

    @Test
    void getVerificationStatus_ownStatus_allowedWithoutAdminRole() {
        identityAs("jdoe", "Citizen", null);
        when(adminUsers.findVerificationStatus("jdoe"))
                .thenReturn(List.of(new HashMap<>(Map.of("verification_status", "PENDING"))));

        ResponseEntity<?> result = controller.getVerificationStatus("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getVerificationStatus_otherUsersStatusAsNonAdmin_returns403() {
        identityAs("jdoe", "Citizen", null);

        ResponseEntity<?> result = controller.getVerificationStatus("someoneelse", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(adminUsers);
    }

    @Test
    void updateVerificationStatus_invalidStatusValue_returns400() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        VerificationDecisionRequest request = new VerificationDecisionRequest();
        request.setStatus("MAYBE");

        ResponseEntity<?> result = controller.updateVerificationStatus("jdoe", request, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(verificationDecisionService);
    }

    @Test
    void updateVerificationStatus_approved_delegatesAndReAddsStatusField() {
        identityAs("sysadmin", "SYSTEM_ADMIN", "Kampala");
        VerificationDecisionRequest request = new VerificationDecisionRequest();
        request.setStatus("approved");
        doReturn(ResponseEntity.ok(new HashMap<>(Map.of("success", true))))
                .when(verificationDecisionService)
                .approve("sysadmin", "SYSTEM_ADMIN", "Kampala", "jdoe");

        ResponseEntity<?> result = controller.updateVerificationStatus("jdoe", request, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) result.getBody();
        assertEquals("APPROVED", body.get("status"));
    }
}
