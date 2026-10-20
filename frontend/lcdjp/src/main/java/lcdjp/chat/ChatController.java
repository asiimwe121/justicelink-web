package lcdjp.chat;

import lcdjp.security.RoleAuthority;
import lcdjp.user.User;
import lcdjp.storage.VoiceStorageService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import lcdjp.user.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.time.LocalDateTime;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/auth/chat")
public class ChatController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(ChatController.class);
    private static final int MESSAGE_HISTORY_CAP = 1000;

    @Autowired
    private ChatRepository chatRepository;

    @Autowired
    private UserAccountRepository userAccounts;

    @Autowired
    private VoiceStorageService voiceStorageService;

    private String getStringFromMap(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return null;
        }
        return value.toString();
    }

    private boolean getBooleanFromMap(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof String) {
            return Boolean.parseBoolean((String) value);
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        return false;
    }

    @PostMapping("/messages")
    public ResponseEntity<?> sendChatMessage(@Valid @RequestBody ChatMessageRequest messageData,
                                             HttpServletRequest request) {
        try {

            String fromUser = authenticatedUsername();
            if (fromUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String fromName = messageData.getFromName();
            String fromRole = messageData.getFromRole();
            String sentTo = messageData.getSentTo();
            String message = messageData.getMessage();
            String type = messageData.getType();
            String audioData = messageData.getAudioData();
            Integer duration = messageData.getDuration() == null ? 0 : messageData.getDuration();
            String reply = messageData.getReply();
            String replyTimestamp = messageData.getReplyTimestamp();
            String timestamp = messageData.getTimestamp();
            boolean isRead = Boolean.TRUE.equals(messageData.getIsRead());
            boolean delivered = Boolean.TRUE.equals(messageData.getDelivered());

            if (type == null) type = "text";

            Map<String, Object> sender = userRow(fromUser);
            String senderRole = getStringFromMap(sender, "role");
            String senderDistrict = getStringFromMap(sender, "district");
            String normalizedSenderRole = senderRole == null ? "" :
                    senderRole.trim().toUpperCase().replace(' ', '_');
            boolean senderIsAdmin = isAdministrator(fromUser);

            boolean sentToIsRealUser = sentTo != null && !sentTo.isBlank()
                    && chatRepository.userExists(sentTo);

            if (senderIsAdmin && sentToIsRealUser) {

            } else if (normalizedSenderRole.equals("DISTRICT_ADMIN")) {

                sentTo = resolveSystemAdminRecipient();
            } else {
                sentTo = resolveCustomerCareRecipient(fromUser, senderDistrict);
            }
            fromName = getStringFromMap(sender, "first_name") + " "
                    + getStringFromMap(sender, "last_name");
            fromRole = senderRole;

            if (audioData != null && !audioData.isBlank()) {
                try {
                    audioData = voiceStorageService.storeIfAudioDataUri(audioData, "CHAT", fromUser, sentTo, null);
                } catch (IllegalArgumentException bad) {
                    return ResponseEntity.badRequest().body(Map.of("error", bad.getMessage()));
                }
            }

            String formattedTimestamp;
            if (timestamp != null) {
                try {
                    String cleaned = timestamp.replace("Z", "");
                    if (cleaned.contains(".")) cleaned = cleaned.substring(0, cleaned.indexOf("."));
                    formattedTimestamp = cleaned.replace("T", " ");
                } catch (Exception e) {
                    formattedTimestamp = LocalDateTime.now().toString().replace("T", " ");
                }
            } else {
                formattedTimestamp = LocalDateTime.now().toString().replace("T", " ");
            }


            chatRepository.insertMessage(fromUser, fromName, fromRole, sentTo, message, type, audioData, duration,
                    formattedTimestamp, reply, replyTimestamp, isRead, delivered);

            logger.info("✅ Chat message saved from: " + fromUser + " → " + sentTo);

            if (!"admin".equalsIgnoreCase(fromUser)) {
                createAdminNotification(sentTo, fromUser, fromName, fromRole, message, type);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Message sent",
                    "recipient", sentTo == null ? "" : sentTo
            ));

        } catch (Exception e) {
            logger.error("❌ Error sending chat message: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send message. Please try again later."));
        }
    }

    @GetMapping("/messages/user/{username}")
    public ResponseEntity<?> getUserChatMessages(@PathVariable String username) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String requestedUsername = isAdministrator(actor) ? username : actor;
            List<Map<String, Object>> messages = chatRepository.findConversation(requestedUsername, MESSAGE_HISTORY_CAP);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            logger.error("❌ Error fetching chat messages: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/messages/admin")
    public ResponseEntity<?> getAllAdminMessages() {
        try {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Administrator access required"));
            }

            List<Map<String, Object>> messages = chatRepository.findAdminMessages(MESSAGE_HISTORY_CAP);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            logger.error("❌ Error fetching admin messages: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @PutMapping("/messages/{messageId}/read")
    public ResponseEntity<?> markChatMessageAsRead(@PathVariable Integer messageId) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!isAdministrator(actor)) {
                if (!chatRepository.isMessageSentTo(messageId, actor)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You may only update messages sent to you"));
                }
            }
            int updated = chatRepository.markRead(messageId);
            if (updated > 0) {
                return ResponseEntity.ok(Map.of("success", true));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Message not found"));
        } catch (Exception e) {
            logger.error("❌ Error marking message as read: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to mark message as read"));
        }
    }

    @PutMapping("/messages/mark-admin-read")
    public ResponseEntity<?> markAdminMessagesAsRead(@Valid @RequestBody MarkMessagesReadRequest request) {
        try {
            String username = authenticatedUsername();
            if (username == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (isAdministrator(username)) {
                if (request.getUsername() != null && !request.getUsername().isBlank()) {
                    username = request.getUsername();
                }
            }
            int updated = chatRepository.markAdminRepliesRead(username);
            return ResponseEntity.ok(Map.of("success", true, "count", updated));
        } catch (Exception e) {
            logger.error("❌ Error marking admin messages as read: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to mark messages as read"));
        }
    }

    @GetMapping("/admin-online")
    public ResponseEntity<?> checkAdminOnline() {
        try {
            return ResponseEntity.ok(Map.of("online", chatRepository.adminAccountExists()));
        } catch (Exception e) {
            logger.error("❌ Error checking admin status: " + e.getMessage());
            return ResponseEntity.ok(Map.of("online", false));
        }
    }

    private void createAdminNotification(String recipient, String fromUser, String fromName,
                                         String fromRole, String message, String type) {
        try {
            String notificationMessage = "New message from " + (fromName != null ? fromName : fromUser) +
                    " (" + (fromRole != null ? fromRole : "User") + "): " +
                    (message != null ? message.substring(0, Math.min(100, message.length())) : "");

            chatRepository.insertChatNotification(recipient, notificationMessage, fromUser, fromName, fromRole, message);

            logger.info("✅ Admin notification created for message from: " + fromUser);

        } catch (Exception e) {
            logger.error("❌ Error creating admin notification: ", e);
        }
    }

    private String authenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;

        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            String username = ((User) principal).getUsername();
            return username == null || username.isBlank() ? null : username;
        }

        String name = authentication.getName();
        return name == null || name.isBlank() || "anonymousUser".equals(name) ? null : name;
    }

    private Map<String, Object> userRow(String username) {
        Map<String, Object> row = chatRepository.findUserSummary(username);
        return row == null ? Map.of("username", username) : row;
    }

    private boolean isAdministrator(String username) {
        return RoleAuthority.isAdministratorRole(getStringFromMap(userRow(username), "role"));
    }

    private String resolveCustomerCareRecipient(String fromUser, String district) {
        String districtAdmin = resolveDistrictAdminRecipient(district);

        if (districtAdmin == null) {
            String systemAdmin = resolveSystemAdminRecipient();
            String prior = resolveExistingConversationRecipient(fromUser);
            return (prior != null && isSystemAdminAccount(prior)) ? prior : systemAdmin;
        }

        String prior = resolveExistingConversationRecipient(fromUser);
        if (prior != null && isDistrictAdminFor(prior, district)) {
            return prior;
        }

        if (prior != null && isSystemAdminAccount(prior)) {
            handOverPendingThread(fromUser, prior, districtAdmin);
        }
        return districtAdmin;
    }

    private String resolveDistrictAdminRecipient(String district) {
        if (district == null || district.isBlank()) return null;
        try {
            return chatRepository.findDistrictAdminUsername(district);
        } catch (Exception e) {
            logger.error("Error resolving district admin for '{}': {}", district, e.getMessage());
            return null;
        }
    }

    private boolean isDistrictAdminFor(String username, String district) {
        if (username == null || district == null || district.isBlank()) return false;
        try {
            return chatRepository.isApprovedDistrictAdminFor(username, district);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isSystemAdminAccount(String username) {
        if (username == null) return false;
        if ("admin".equalsIgnoreCase(username)) return true;
        String role = getStringFromMap(userRow(username), "role");
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                || normalized.equals("SYSTEM_ADMINISTRATOR");
    }

    private void handOverPendingThread(String fromUser, String previousRecipient,
                                       String newRecipient) {
        if (fromUser == null || previousRecipient == null || newRecipient == null) return;
        if (previousRecipient.equalsIgnoreCase(newRecipient)) return;
        try {
            if (chatRepository.hasMessageFromTo(previousRecipient, fromUser)) return;

            int moved = chatRepository.reassignThread(fromUser, previousRecipient, newRecipient);
            if (moved > 0) {
                logger.info("Handed over {} unanswered support message(s) from {}: {} -> {}",
                        moved, fromUser, previousRecipient, newRecipient);
            }
        } catch (Exception e) {
            logger.warn("Could not hand over support thread for {}: {}", fromUser, e.getMessage());
        }
    }

    private String resolveExistingConversationRecipient(String fromUser) {
        try {
            String priorRecipient = chatRepository.findLastRecipient(fromUser);
            if (priorRecipient == null || priorRecipient.isBlank()) return null;

            return chatRepository.isApprovedUser(priorRecipient) ? priorRecipient : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveSystemAdminRecipient() {
        String systemAdmin = userAccounts.findSystemAdminUsername();
        return systemAdmin == null ? "admin" : systemAdmin;
    }
}