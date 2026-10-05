package lcdjp;

import org.junit.jupiter.api.AfterEach;
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
class NotificationControllerTest {

    @Mock private NotificationService notificationService;
    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private NotificationController controller;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, "pw", List.of()));
    }

    private SendNotificationRequest sendRequest(String username, String message, String type) {
        SendNotificationRequest r = new SendNotificationRequest();
        r.setUsername(username);
        r.setMessage(message);
        r.setType(type);
        return r;
    }

    @Test
    void getUserNotifications_noAuth_returns401() {
        ResponseEntity<?> result = controller.getUserNotifications("alice");

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(notificationService);
    }

    @Test
    void getUserNotifications_differentNonAdminUser_returns403() {
        authenticateAs("mallory");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("mallory")))
                .thenReturn("Citizen");

        ResponseEntity<?> result = controller.getUserNotifications("alice");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(notificationService);
    }

    @Test
    void getUserNotifications_owner_returnsNotificationsWithCount() {
        authenticateAs("alice");
        when(notificationService.getNotificationsByUser("alice"))
                .thenReturn(List.of(new Notification(), new Notification()));

        ResponseEntity<?> result = controller.getUserNotifications("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(2, ((Map<?, ?>) result.getBody()).get("count"));
    }

    @Test
    void getUserNotifications_serviceThrows_returns400() {
        authenticateAs("alice");
        when(notificationService.getNotificationsByUser("alice"))
                .thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> result = controller.getUserNotifications("alice");

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void getUnreadNotifications_admin_actingForAnotherUser_isAllowed() {
        authenticateAs("admin1");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("admin1")))
                .thenReturn("Admin");
        when(notificationService.getUnreadNotifications("alice")).thenReturn(List.of());
        when(notificationService.getUnreadCount("alice")).thenReturn(0L);

        ResponseEntity<?> result = controller.getUnreadNotifications("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void markAsRead_notificationNotFound_returns404() {
        authenticateAs("alice");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq(1L)))
                .thenThrow(new RuntimeException("no such row"));

        ResponseEntity<?> result = controller.markAsRead(1L);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verifyNoInteractions(notificationService);
    }

    @Test
    void markAsRead_notOwnerNotAdmin_returns403() {
        authenticateAs("mallory");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq(1L))).thenReturn("alice");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("mallory")))
                .thenReturn("Citizen");

        ResponseEntity<?> result = controller.markAsRead(1L);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(notificationService, never()).markAsRead(anyLong());
    }

    @Test
    void markAsRead_owner_marksAndReturnsNotification() {
        authenticateAs("alice");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq(1L))).thenReturn("alice");
        Notification n = new Notification();
        when(notificationService.markAsRead(1L)).thenReturn(n);

        ResponseEntity<?> result = controller.markAsRead(1L);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertSame(n, ((Map<?, ?>) result.getBody()).get("notification"));
    }

    @Test
    void deleteNotification_notOwnerNotAdmin_returns403() {
        authenticateAs("mallory");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq(1L))).thenReturn("alice");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("mallory")))
                .thenReturn("Citizen");

        ResponseEntity<?> result = controller.deleteNotification(1L);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(notificationService, never()).deleteNotification(anyLong());
    }

    @Test
    void sendNotification_noAuth_returns401() {
        ResponseEntity<?> result = controller.sendNotification(sendRequest("alice", "hi", "INFO"));

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(notificationService);
    }

    @Test
    void sendNotification_nonAdminSendingToSomeoneElse_returns403() {
        authenticateAs("bob");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("bob")))
                .thenReturn("Citizen");

        ResponseEntity<?> result = controller.sendNotification(sendRequest("alice", "hi", "INFO"));

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(notificationService);
    }

    @Test
    void sendNotification_derivesSenderFromAuthenticatedCaller_notRequestBody() {
        authenticateAs("bob");
        when(jdbcTemplate.queryForObject(contains("CONCAT"), eq(String.class), eq("bob")))
                .thenReturn("Bob Smith");
        when(jdbcTemplate.queryForObject(contains("SELECT role"), eq(String.class), eq("bob")))
                .thenReturn("Citizen");
        Notification n = new Notification();
        when(notificationService.createNotification(eq("bob"), eq("hi"), eq("INFO"),
                eq("bob"), eq("Bob Smith"), eq("Citizen"))).thenReturn(n);

        ResponseEntity<?> result = controller.sendNotification(sendRequest("bob", "hi", "INFO"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(notificationService).createNotification("bob", "hi", "INFO", "bob", "Bob Smith", "Citizen");
    }

    @Test
    void sendNotification_admin_maySendAsAnotherUser() {
        authenticateAs("admin1");
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("admin1")))
                .thenReturn("Admin");
        when(notificationService.createNotification(
                eq("alice"), eq("hi"), eq("INFO"), eq("admin1"), anyString(), eq("Admin")))
                .thenReturn(new Notification());

        ResponseEntity<?> result = controller.sendNotification(sendRequest("alice", "hi", "INFO"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(notificationService).createNotification(eq("alice"), eq("hi"), eq("INFO"),
                eq("admin1"), anyString(), eq("Admin"));
    }

    @Test
    void sendNotification_lookupFailsGracefully_fallsBackToUsernameAsDisplayName() {
        authenticateAs("bob");
        when(jdbcTemplate.queryForObject(contains("CONCAT"), eq(String.class), eq("bob")))
                .thenThrow(new RuntimeException("no such user row"));
        when(jdbcTemplate.queryForObject(contains("SELECT role"), eq(String.class), eq("bob")))
                .thenReturn("Citizen");

        controller.sendNotification(sendRequest("bob", "hi", "INFO"));

        verify(notificationService).createNotification(eq("bob"), eq("hi"), eq("INFO"),
                eq("bob"), eq("bob"), eq("Citizen"));
    }
}
