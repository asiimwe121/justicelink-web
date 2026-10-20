package lcdjp.auth;

import lcdjp.notification.NotificationCreateRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthNotificationControllerTest {

    @Mock private AuthNotificationRepository authNotifications;
    @Mock private Authentication authentication;

    @InjectMocks
    private AuthNotificationController controller;

    @Test
    void getNotifications_unauthenticated_returnsEmptyList_withoutHittingDb() {
        ResponseEntity<?> result = controller.getNotifications(null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(List.of(), ((Map<?, ?>) result.getBody()).get("notifications"));
        verifyNoInteractions(authNotifications);
    }

    @Test
    void unreadCount_unauthenticated_returnsZero_notAnError() {
        ResponseEntity<?> result = controller.getUnreadNotificationsCount("tekwo123", null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(0, ((Map<?, ?>) result.getBody()).get("unreadCount"));
        verifyNoInteractions(authNotifications);
    }

    @Test
    void getNotifications_authenticated_fetchesByCallerUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findLatest("jdoe", 50)).thenReturn(List.of(Map.of("id", 1)));

        ResponseEntity<?> result = controller.getNotifications(authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue((Boolean) ((Map<?, ?>) result.getBody()).get("success"));
    }

    @Test
    void markNotificationRead_regularUser_updatesByOwnUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findRole("jdoe")).thenReturn("Citizen");
        when(authNotifications.markReadForUser(5L, "jdoe")).thenReturn(1);

        ResponseEntity<?> result = controller.markNotificationRead(5L, authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(authNotifications, never()).markReadInAdminInbox(any());
    }

    @Test
    void markNotificationRead_sharedInboxRole_updatesByAdminUsername_notActorUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("district_admin_kla");
        when(authNotifications.findRole("district_admin_kla")).thenReturn("DISTRICT_ADMIN");
        when(authNotifications.markReadInAdminInbox(7L)).thenReturn(1);

        ResponseEntity<?> result = controller.markNotificationRead(7L, authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(authNotifications, never()).markReadForUser(any(), any());
    }

    @Test
    void markNotificationRead_noRowsUpdated_andNotBelongingToActor_returns404() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findRole("jdoe")).thenReturn("Citizen");
        when(authNotifications.markReadForUser(5L, "jdoe")).thenReturn(0);
        Map<String, Object> row = new HashMap<>();
        row.put("username", "someoneelse");
        row.put("is_read", false);
        when(authNotifications.findOwnerAndReadFlag(5L)).thenReturn(row);

        ResponseEntity<?> result = controller.markNotificationRead(5L, authentication);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void markNotificationRead_alreadyReadByActor_returnsOkNotNotFound() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findRole("jdoe")).thenReturn("Citizen");
        when(authNotifications.markReadForUser(5L, "jdoe")).thenReturn(0);
        Map<String, Object> row = new HashMap<>();
        row.put("username", "jdoe");
        row.put("is_read", true);
        when(authNotifications.findOwnerAndReadFlag(5L)).thenReturn(row);

        ResponseEntity<?> result = controller.markNotificationRead(5L, authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("Notification already marked as read", ((Map<?, ?>) result.getBody()).get("message"));
    }

    @Test
    void markAllRead_differentUserWithoutSystemAdminRole_isForbidden() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findRole("jdoe")).thenReturn("Citizen");

        ResponseEntity<?> result = controller.markAllNotificationsAsRead("someoneelse", authentication);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(authNotifications, never()).markAllRead(anyString());
    }

    @Test
    void markAllRead_systemAdmin_canMarkAnotherUsersNotificationsRead() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("system_admin");
        when(authNotifications.findRole("system_admin")).thenReturn("SYSTEM_ADMIN");
        when(authNotifications.markAllRead("someoneelse")).thenReturn(3);

        ResponseEntity<?> result = controller.markAllNotificationsAsRead("someoneelse", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(3, ((Map<?, ?>) result.getBody()).get("count"));
    }

    @Test
    void markAllRead_ownUsername_isAlwaysAllowed_evenWithNoRecognizedRole() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findRole("jdoe")).thenReturn(null);
        when(authNotifications.markAllRead("jdoe")).thenReturn(1);

        ResponseEntity<?> result = controller.markAllNotificationsAsRead("jdoe", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getUnreadCount_sharedInboxRole_countsAdminRowNotOwnUsername() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("admin_user");
        when(authNotifications.findRole("admin_user")).thenReturn("Admin");
        when(authNotifications.countUnread("admin")).thenReturn(4);

        ResponseEntity<?> result = controller.getUnreadNotificationsCount("admin_user", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(4, ((Map<?, ?>) result.getBody()).get("unreadCount"));
    }

    @Test
    void getUserNotifications_regularUser_usesPathUsernameAsIs() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findRole("jdoe")).thenReturn("Citizen");
        when(authNotifications.findLatest("jdoe", 50)).thenReturn(List.of());

        ResponseEntity<?> result = controller.getUserNotifications("jdoe", authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(authNotifications).findLatest("jdoe", 50);
    }

    @Test
    void createNotification_missingUsername_isBadRequest() {
        NotificationCreateRequest body = new NotificationCreateRequest();
        body.setMessage("hi");

        ResponseEntity<?> result = controller.createNotification(body);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(authNotifications, never()).insertNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    void createNotification_chatWithDistrict_routesToDistrictAdmin() {
        NotificationCreateRequest body = new NotificationCreateRequest();
        body.setMessage("help please");
        body.setType("chat");
        body.setDistrict("Kampala");
        when(authNotifications.findDistrictAdminForSupport("Kampala")).thenReturn("district_admin_kla");

        ResponseEntity<?> result = controller.createNotification(body);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(authNotifications).insertNotification("district_admin_kla", "help please", "chat", "system", "System", "System");
    }

    @Test
    void createNotification_chatWithDistrictButNoAdminFound_fallsBackToSystemAdmin() {
        NotificationCreateRequest body = new NotificationCreateRequest();
        body.setMessage("help please");
        body.setType("chat");
        body.setDistrict("Nowhereville");
        when(authNotifications.findDistrictAdminForSupport("Nowhereville")).thenReturn(null);

        ResponseEntity<?> result = controller.createNotification(body);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(authNotifications).insertNotification("system_admin", "help please", "chat", "system", "System", "System");
    }

    @Test
    void postAdminChatNotification_insertsUnderAdminUsername_andReturnsCallersNotifications() {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("jdoe");
        when(authNotifications.findLatest("jdoe", 20)).thenReturn(List.of(Map.of("id", 1)));

        ResponseEntity<?> result = controller.postAdminChatNotification(Map.of("message", "hello"), authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(authNotifications).insertAdminChatNotification(eq("admin"), contains("New chat message from jdoe"), eq("jdoe"));
    }

    @Test
    void postAdminChatNotification_withoutAuthentication_returnsUnauthorized() {
        ResponseEntity<?> result = controller.postAdminChatNotification(Map.of("message", "hello"), null);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verify(authNotifications, never()).insertAdminChatNotification(any(), any(), any());
    }
}
