package lcdjp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthNotificationControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private Authentication authentication;

    @InjectMocks
    private AuthNotificationController controller;

    @Test
    void getNotifications_unauthenticated_returns401_withoutHittingDb() {
        ResponseEntity<?> result = controller.getNotifications(null);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getNotifications_authenticated_fetchesByCallerUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(jdbcTemplate.queryForList(anyString(), eq("jdoe"))).thenReturn(List.of(Map.of("id", 1)));

        ResponseEntity<?> result = controller.getNotifications(authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue((Boolean) ((Map<?, ?>) result.getBody()).get("success"));
    }

    @Test
    void markNotificationRead_regularUser_updatesByOwnUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("jdoe"))).thenReturn("Citizen");
        when(jdbcTemplate.update(contains("LOWER(TRIM(username))"), eq(5L), eq("jdoe"))).thenReturn(1);

        ResponseEntity<?> result = controller.markNotificationRead(5L, authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("username = 'admin'"), any(Object.class));
    }

    @Test
    void markNotificationRead_sharedInboxRole_updatesByAdminUsername_notActorUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("district_admin_kla");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("district_admin_kla")))
                .thenReturn("DISTRICT_ADMIN");
        when(jdbcTemplate.update(contains("username = 'admin'"), eq(7L))).thenReturn(1);

        ResponseEntity<?> result = controller.markNotificationRead(7L, authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("LOWER(TRIM(username))"), any(), any());
    }

    @Test
    void markNotificationRead_noRowsUpdated_andNotBelongingToActor_returns404() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("jdoe"))).thenReturn("Citizen");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);
        Map<String, Object> row = new HashMap<>();
        row.put("username", "someoneelse");
        row.put("is_read", false);
        when(jdbcTemplate.queryForMap(anyString(), eq(5L))).thenReturn(row);

        ResponseEntity<?> result = controller.markNotificationRead(5L, authentication);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void markNotificationRead_alreadyReadByActor_returnsOkNotNotFound() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("jdoe"))).thenReturn("Citizen");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);
        Map<String, Object> row = new HashMap<>();
        row.put("username", "jdoe");
        row.put("is_read", true);
        when(jdbcTemplate.queryForMap(anyString(), eq(5L))).thenReturn(row);

        ResponseEntity<?> result = controller.markNotificationRead(5L, authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("Notification already marked as read", ((Map<?, ?>) result.getBody()).get("message"));
    }

    @Test
    void markAllRead_differentUserWithoutSystemAdminRole_isForbidden() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("jdoe"))).thenReturn("Citizen");

        ResponseEntity<?> result = controller.markAllNotificationsAsRead("someoneelse", authentication);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("UPDATE notifications SET is_read"), anyString());
    }

    @Test
    void markAllRead_systemAdmin_canMarkAnotherUsersNotificationsRead() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("system_admin");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("system_admin"))).thenReturn("SYSTEM_ADMIN");
        when(jdbcTemplate.update(anyString(), eq("someoneelse"))).thenReturn(3);

        ResponseEntity<?> result = controller.markAllNotificationsAsRead("someoneelse", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(3, ((Map<?, ?>) result.getBody()).get("count"));
    }

    @Test
    void markAllRead_ownUsername_isAlwaysAllowed_evenWithNoRecognizedRole() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("jdoe"))).thenReturn(null);
        when(jdbcTemplate.update(anyString(), eq("jdoe"))).thenReturn(1);

        ResponseEntity<?> result = controller.markAllNotificationsAsRead("jdoe", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getUnreadCount_sharedInboxRole_countsAdminRowNotOwnUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("admin_user");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("admin_user"))).thenReturn("Admin");
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("admin"))).thenReturn(4);

        ResponseEntity<?> result = controller.getUnreadNotificationsCount("admin_user", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(4, ((Map<?, ?>) result.getBody()).get("unreadCount"));
    }

    @Test
    void getUserNotifications_regularUser_usesPathUsernameAsIs() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("jdoe"))).thenReturn("Citizen");
        when(jdbcTemplate.queryForList(anyString(), eq("jdoe"))).thenReturn(List.of());

        ResponseEntity<?> result = controller.getUserNotifications("jdoe", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).queryForList(anyString(), eq("jdoe"));
    }

    @Test
    void createNotification_missingUsername_isBadRequest() {
        NotificationCreateRequest body = new NotificationCreateRequest();
        body.setMessage("hi");

        ResponseEntity<?> result = controller.createNotification(body);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("INSERT INTO notifications"), any(), any(), any(), any(), any(), any());
    }

    @Test
    void createNotification_chatWithDistrict_routesToDistrictAdmin() {
        NotificationCreateRequest body = new NotificationCreateRequest();
        body.setMessage("help please");
        body.setType("chat");
        body.setDistrict("Kampala");
        when(jdbcTemplate.queryForList(contains("WHERE district = ? AND role = 'DISTRICT_ADMIN'"), eq("Kampala")))
                .thenReturn(List.of(Map.of("username", "district_admin_kla")));

        ResponseEntity<?> result = controller.createNotification(body);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(anyString(), eq("district_admin_kla"), eq("help please"),
                eq("chat"), eq("system"), eq("System"), eq("System"));
    }

    @Test
    void createNotification_chatWithDistrictButNoAdminFound_fallsBackToSystemAdmin() {
        NotificationCreateRequest body = new NotificationCreateRequest();
        body.setMessage("help please");
        body.setType("chat");
        body.setDistrict("Nowhereville");
        when(jdbcTemplate.queryForList(contains("DISTRICT_ADMIN"), eq("Nowhereville"))).thenReturn(List.of());

        ResponseEntity<?> result = controller.createNotification(body);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(anyString(), eq("system_admin"), eq("help please"),
                eq("chat"), eq("system"), eq("System"), eq("System"));
    }

    @Test
    void getAdminChatNotifications_insertsUnderAdminUsername_andReturnsCallersNotifications() {
        when(jdbcTemplate.queryForList(contains("SELECT * FROM notifications"), eq("jdoe")))
                .thenReturn(List.of(Map.of("id", 1)));

        ResponseEntity<?> result = controller.getAdminChatNotifications("jdoe", "hello");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(contains("INSERT INTO notifications"), eq("admin"),
                contains("New chat message from jdoe"), eq("jdoe"), eq("jdoe"));
    }
}
