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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactRequestControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private ContactRequestController controller;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }

    @Test
    void getIncoming_unauthenticated_returns401() {
        ResponseEntity<?> result = controller.getIncomingContactRequests("jdoe");

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getIncoming_differentNonAdminUser_isForbidden() {
        authenticateAs("mallory");
        when(jdbcTemplate.queryForList(contains("SELECT role FROM users"), eq("mallory")))
                .thenReturn(List.of(Map.of("role", "Citizen")));

        ResponseEntity<?> result = controller.getIncomingContactRequests("jdoe");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getIncoming_tableMissing_returnsEmptyListInsteadOfError() {
        authenticateAs("jdoe");
        when(jdbcTemplate.queryForList("SHOW TABLES LIKE 'contact_requests'")).thenReturn(List.of());

        ResponseEntity<?> result = controller.getIncomingContactRequests("jdoe");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(List.of(), result.getBody());
    }

    @Test
    void getIncoming_dbThrows_returnsEmptyListRatherThan500() {
        authenticateAs("jdoe");
        when(jdbcTemplate.queryForList("SHOW TABLES LIKE 'contact_requests'"))
                .thenThrow(new RuntimeException("db down"));

        ResponseEntity<?> result = controller.getIncomingContactRequests("jdoe");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(List.of(), result.getBody());
    }

    @Test
    void create_unauthenticated_returns401_withoutInsert() {
        ContactRequestCreateRequest body = new ContactRequestCreateRequest();
        body.setRecipient("jdoe");
        body.setMessage("hi");

        ResponseEntity<?> result = controller.createContactRequest(body);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void create_tableMissing_returns503() {
        authenticateAs("jdoe");
        when(jdbcTemplate.queryForList("SHOW TABLES LIKE 'contact_requests'")).thenReturn(List.of());
        ContactRequestCreateRequest body = new ContactRequestCreateRequest();
        body.setRecipient("mary");
        body.setMessage("hi");

        ResponseEntity<?> result = controller.createContactRequest(body);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
    }

    @Test
    void create_success_insertsWithSenderFromAuthNotClientInput() {
        authenticateAs("jdoe");
        when(jdbcTemplate.queryForList("SHOW TABLES LIKE 'contact_requests'"))
                .thenReturn(List.of(Map.of("Tables_in_db", "contact_requests")));
        ContactRequestCreateRequest body = new ContactRequestCreateRequest();
        body.setRecipient("mary");
        body.setMessage("hello there");

        ResponseEntity<?> result = controller.createContactRequest(body);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(contains("INSERT INTO contact_requests"), eq("jdoe"), eq("mary"), eq("hello there"));
    }

    @Test
    void accept_notFound_returns404() {
        when(jdbcTemplate.queryForList(contains("SELECT sender, recipient FROM contact_requests"), eq(5)))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.acceptContactRequest(5);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void accept_callerNotRecipient_isForbidden_andDoesNotUpdate() {
        authenticateAs("intruder");
        Map<String, Object> row = new HashMap<>();
        row.put("sender", "jdoe");
        row.put("recipient", "mary");
        when(jdbcTemplate.queryForList(contains("SELECT sender, recipient FROM contact_requests"), eq(5)))
                .thenReturn(List.of(row));
        when(jdbcTemplate.queryForList(contains("SELECT role FROM users"), eq("intruder")))
                .thenReturn(List.of(Map.of("role", "Citizen")));

        ResponseEntity<?> result = controller.acceptContactRequest(5);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("UPDATE contact_requests"), any(Object.class));
    }

    @Test
    void accept_recipientAccepts_updatesAndNotifiesSender() {
        authenticateAs("mary");
        Map<String, Object> row = new HashMap<>();
        row.put("sender", "jdoe");
        row.put("recipient", "mary");
        when(jdbcTemplate.queryForList(contains("SELECT sender, recipient FROM contact_requests"), eq(5)))
                .thenReturn(List.of(row));

        ResponseEntity<?> result = controller.acceptContactRequest(5);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(contains("UPDATE contact_requests SET status = 'accepted'"), eq(5));
        verify(jdbcTemplate).update(contains("INSERT INTO notifications"), eq("jdoe"), contains("mary"));
    }

    @Test
    void delete_notFound_returns404() {
        when(jdbcTemplate.queryForList(anyString(), eq(9))).thenReturn(List.of());

        ResponseEntity<?> result = controller.deleteContactRequest(9);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void delete_neitherSenderNorRecipientNorAdmin_isForbidden() {
        authenticateAs("intruder");
        Map<String, Object> row = new HashMap<>();
        row.put("sender", "jdoe");
        row.put("recipient", "mary");
        when(jdbcTemplate.queryForList(anyString(), eq(9))).thenReturn(List.of(row));
        when(jdbcTemplate.queryForList(contains("SELECT role FROM users"), eq("intruder")))
                .thenReturn(List.of(Map.of("role", "Citizen")));

        ResponseEntity<?> result = controller.deleteContactRequest(9);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("DELETE FROM contact_requests"), any(Object.class));
    }

    @Test
    void delete_sender_isAllowedToDeleteTheirOwnRequest() {
        authenticateAs("jdoe");
        Map<String, Object> row = new HashMap<>();
        row.put("sender", "jdoe");
        row.put("recipient", "mary");
        when(jdbcTemplate.queryForList(anyString(), eq(9))).thenReturn(List.of(row));
        when(jdbcTemplate.update(contains("DELETE FROM contact_requests"), eq(9))).thenReturn(1);

        ResponseEntity<?> result = controller.deleteContactRequest(9);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }
}
