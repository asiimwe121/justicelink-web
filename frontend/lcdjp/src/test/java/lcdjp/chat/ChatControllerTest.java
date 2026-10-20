package lcdjp.chat;

import lcdjp.user.UserAccountRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock private ChatRepository chatRepository;
    @Mock private UserAccountRepository userAccounts;

    private ChatController controller;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        controller = new ChatController();
        ReflectionTestUtils.setField(controller, "chatRepository", chatRepository);
        ReflectionTestUtils.setField(controller, "userAccounts", userAccounts);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void loginAs(String username, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                username, null, List.of(new SimpleGrantedAuthority(role))));
        when(chatRepository.findUserSummary(username)).thenReturn(Map.of("username", username, "role", role));
    }

    @Test
    void getUserChatMessages_notAuthenticated_returns401() {
        ResponseEntity<?> result = controller.getUserChatMessages("alice");

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(chatRepository);
    }

    @Test
    void getUserChatMessages_nonAdmin_readsOnlyOwnThreadWhateverThePathSays() {
        loginAs("bob", "Citizen");
        List<Map<String, Object>> mine = List.of(Map.of("id", 1));
        when(chatRepository.findConversation("bob", 1000)).thenReturn(mine);

        ResponseEntity<?> result = controller.getUserChatMessages("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(mine, result.getBody());
        verify(chatRepository, never()).findConversation(eq("alice"), anyInt());
    }

    @Test
    void getUserChatMessages_admin_canReadAnyThread() {
        loginAs("boss", "Admin");
        when(chatRepository.findConversation("alice", 1000)).thenReturn(List.of());

        ResponseEntity<?> result = controller.getUserChatMessages("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(chatRepository).findConversation("alice", 1000);
    }

    @Test
    void getAllAdminMessages_nonAdmin_returns403() {
        loginAs("bob", "Citizen");

        ResponseEntity<?> result = controller.getAllAdminMessages();

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(chatRepository, never()).findAdminMessages(anyInt());
    }

    @Test
    void markChatMessageAsRead_notOwner_returns403AndChangesNothing() {
        loginAs("bob", "Citizen");
        when(chatRepository.isMessageSentTo(7, "bob")).thenReturn(false);

        ResponseEntity<?> result = controller.markChatMessageAsRead(7);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(chatRepository, never()).markRead(any());
    }

    @Test
    void markChatMessageAsRead_owner_marksItRead() {
        loginAs("bob", "Citizen");
        when(chatRepository.isMessageSentTo(7, "bob")).thenReturn(true);
        when(chatRepository.markRead(7)).thenReturn(1);

        ResponseEntity<?> result = controller.markChatMessageAsRead(7);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void markChatMessageAsRead_admin_skipsTheOwnershipCheck() {
        loginAs("boss", "Admin");
        when(chatRepository.markRead(7)).thenReturn(1);

        ResponseEntity<?> result = controller.markChatMessageAsRead(7);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(chatRepository, never()).isMessageSentTo(any(), any());
    }

    @Test
    void markChatMessageAsRead_unknownMessage_returns404() {
        loginAs("boss", "Admin");
        when(chatRepository.markRead(99)).thenReturn(0);

        ResponseEntity<?> result = controller.markChatMessageAsRead(99);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void markChatMessageAsRead_databaseFailure_returns500() {
        loginAs("boss", "Admin");
        when(chatRepository.markRead(7)).thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> result = controller.markChatMessageAsRead(7);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    @Test
    void checkAdminOnline_reflectsTheRepository() {
        when(chatRepository.adminAccountExists()).thenReturn(true);

        ResponseEntity<?> result = controller.checkAdminOnline();

        assertEquals(Map.of("online", true), result.getBody());
    }

    @Test
    void checkAdminOnline_databaseFailure_reportsOffline() {
        when(chatRepository.adminAccountExists()).thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> result = controller.checkAdminOnline();

        assertEquals(Map.of("online", false), result.getBody());
    }
}
