package lcdjp.auth;

import lcdjp.security.LoginLockoutService;
import lcdjp.security.RequestIdentity;
import lcdjp.user.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetLinkControllerTest {

    @Mock private UserAccountRepository userAccounts;
    @Mock private RequestIdentity requestIdentity;
    @Mock private LoginLockoutService loginLockoutService;
    @Mock private HttpServletRequest request;

    @InjectMocks
    private PasswordResetLinkController controller;

    private Map<String, Object> target(String role, String district) {
        Map<String, Object> row = new HashMap<>();
        row.put("username", "bob");
        row.put("role", role);
        row.put("district", district);
        return row;
    }

    @BeforeEach
    void sanityCheckWiring() {
        // The controller field-injects userAccounts by type; make sure the mock actually landed.
        Object injected = ReflectionTestUtils.getField(controller, "userAccounts");
        assertEquals(userAccounts, injected);
    }

    @Test
    void loginLockStatus_notAuthenticated_returns401() {
        when(requestIdentity.resolveUsername(request)).thenReturn(null);

        ResponseEntity<?> result = controller.loginLockStatus("bob", request);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(userAccounts);
    }

    @Test
    void loginLockStatus_nonAdmin_returns403_withoutLookingUpTheTarget() {
        when(requestIdentity.resolveUsername(request)).thenReturn("citizen1");
        when(requestIdentity.resolveRole(request, "citizen1")).thenReturn("Citizen");

        ResponseEntity<?> result = controller.loginLockStatus("bob", request);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(userAccounts);
    }

    @Test
    void loginLockStatus_unknownTarget_returns404() {
        when(requestIdentity.resolveUsername(request)).thenReturn("root");
        when(requestIdentity.resolveRole(request, "root")).thenReturn("SYSTEM_ADMIN");
        when(userAccounts.findResetTarget("ghost")).thenReturn(null);

        ResponseEntity<?> result = controller.loginLockStatus("ghost", request);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void loginLockStatus_districtAdmin_cannotManageAdministratorAccounts() {
        when(requestIdentity.resolveUsername(request)).thenReturn("kla_admin");
        when(requestIdentity.resolveRole(request, "kla_admin")).thenReturn("DISTRICT_ADMIN");
        when(userAccounts.findResetTarget("bob")).thenReturn(target("SYSTEM_ADMIN", "Kampala"));

        ResponseEntity<?> result = controller.loginLockStatus("bob", request);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void loginLockStatus_districtAdmin_otherDistrict_returns403() {
        when(requestIdentity.resolveUsername(request)).thenReturn("kla_admin");
        when(requestIdentity.resolveRole(request, "kla_admin")).thenReturn("DISTRICT_ADMIN");
        when(requestIdentity.resolveDistrict(request, "kla_admin")).thenReturn("Kampala");
        when(userAccounts.findResetTarget("bob")).thenReturn(target("Citizen", "Wakiso"));

        ResponseEntity<?> result = controller.loginLockStatus("bob", request);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void loginLockStatus_systemAdmin_reportsLock() {
        when(requestIdentity.resolveUsername(request)).thenReturn("root");
        when(requestIdentity.resolveRole(request, "root")).thenReturn("SYSTEM_ADMIN");
        when(userAccounts.findResetTarget("bob")).thenReturn(target("Citizen", "Wakiso"));
        when(loginLockoutService.lockedUntil("bob")).thenReturn(LocalDateTime.now().plusMinutes(10));

        ResponseEntity<?> result = controller.loginLockStatus("bob", request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(true, ((Map<?, ?>) result.getBody()).get("locked"));
    }
}
