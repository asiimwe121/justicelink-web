package lcdjp.user;

import lcdjp.admin.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AuditLogService auditLogService;
    @Mock private PhoneUtil phoneUtil;
    @Mock private HttpServletRequest request;
    @Mock private HttpSession session;

    @InjectMocks
    private ProfileController profileController;

    @BeforeEach
    void wireRepositories() {
        ReflectionTestUtils.setField(profileController, "userAccounts", new UserAccountRepository(jdbcTemplate));
    }

    private Map<String, Object> row(String username) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("username", username);
        row.put("email", "old@example.com");
        return row;
    }

    @Test
    void getProfileWithNoSessionIsUnauthenticated() {
        when(request.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = profileController.getProfile(request);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getProfileWithSessionButNoUsernameAttributeIsUnauthenticated() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn(null);

        ResponseEntity<?> result = profileController.getProfile(request);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getProfileReturnsNotFoundWhenUserRowMissing() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("ghost");
        when(jdbcTemplate.queryForList(anyString(), eq("ghost"))).thenReturn(List.of());

        ResponseEntity<?> result = profileController.getProfile(request);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void getProfileReturnsRowWithoutOrgFieldsForNonOrgUser() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        when(jdbcTemplate.queryForList(anyString(), eq("alice")))
                .thenReturn(List.of(row("alice")));
        when(session.getAttribute("isOrganization")).thenReturn(null);

        ResponseEntity<?> result = profileController.getProfile(request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        Map<?, ?> profile = (Map<?, ?>) body.get("profile");
        assertEquals(false, profile.get("isOrganization"));
        assertNull(profile.get("orgName"));
    }

    @Test
    void getProfileIncludesOrgFieldsWhenSessionMarksOrganization() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("legalorg1");
        when(jdbcTemplate.queryForList(anyString(), eq("legalorg1")))
                .thenReturn(List.of(row("legalorg1")));
        when(session.getAttribute("isOrganization")).thenReturn(Boolean.TRUE);
        when(session.getAttribute("orgName")).thenReturn("Kampala Legal Aid");
        when(session.getAttribute("orgType")).thenReturn("NGO");

        ResponseEntity<?> result = profileController.getProfile(request);

        Map<?, ?> body = (Map<?, ?>) result.getBody();
        Map<?, ?> profile = (Map<?, ?>) body.get("profile");
        assertEquals(true, profile.get("isOrganization"));
        assertEquals("Kampala Legal Aid", profile.get("orgName"));
        assertEquals("NGO", profile.get("orgType"));
    }

    @Test
    void getProfileReturns500OnDatabaseError() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        when(jdbcTemplate.queryForList(anyString(), eq("alice")))
                .thenThrow(new RuntimeException("db down"));

        ResponseEntity<?> result = profileController.getProfile(request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    @Test
    void updateProfileWithNoSessionIsUnauthenticated() {
        when(request.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = profileController.updateProfile(new ProfileUpdateRequest(), request);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void updateProfileWithNoFieldsSuppliedIsBadRequest() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");

        ResponseEntity<?> result = profileController.updateProfile(new ProfileUpdateRequest(), request);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void updateProfileRejectsInvalidPhoneNumber() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        ProfileUpdateRequest req = new ProfileUpdateRequest();
        req.setPhone("123");

        ResponseEntity<?> result = profileController.updateProfile(req, request);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void updateProfileRejectsPhoneAlreadyUsedByAnotherAccount() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        ProfileUpdateRequest req = new ProfileUpdateRequest();
        req.setPhone("0700111222");
        when(phoneUtil.isAlreadyUsed("0700111222", "alice")).thenReturn(true);

        ResponseEntity<?> result = profileController.updateProfile(req, request);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void updateProfileRejectsEmailAlreadyUsedByAnotherAccount() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        ProfileUpdateRequest req = new ProfileUpdateRequest();
        req.setEmail("taken@example.com");
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("taken@example.com"), eq("alice")))
                .thenReturn(1);

        ResponseEntity<?> result = profileController.updateProfile(req, request);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void updateProfileRejectsOversizedAvatar() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        ProfileUpdateRequest req = new ProfileUpdateRequest();
        req.setAvatarData("x".repeat(3_000_001));

        ResponseEntity<?> result = profileController.updateProfile(req, request);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void updateProfileSuccessUpdatesOnlySessionAttributesThatWereSent() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        ProfileUpdateRequest req = new ProfileUpdateRequest();
        req.setDistrict("Kampala");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        ResponseEntity<?> result = profileController.updateProfile(req, request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(session).setAttribute("district", "Kampala");
        verify(session, never()).setAttribute(eq("phone"), any());
        verify(session, never()).setAttribute(eq("village"), any());
        verify(auditLogService).logAction(
                eq("alice"), eq("User"), eq("PROFILE_UPDATED"), eq("user"), eq("alice"), anyString());
    }

    @Test
    void updateProfileReturns500WhenNoRowsAffected() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        ProfileUpdateRequest req = new ProfileUpdateRequest();
        req.setDistrict("Kampala");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);

        ResponseEntity<?> result = profileController.updateProfile(req, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void updateProfileReturns500OnDatabaseError() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("alice");
        ProfileUpdateRequest req = new ProfileUpdateRequest();
        req.setDistrict("Kampala");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenThrow(new RuntimeException("db down"));

        ResponseEntity<?> result = profileController.updateProfile(req, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }
}
