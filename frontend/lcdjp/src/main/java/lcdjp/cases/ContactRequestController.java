package lcdjp.cases;

import lcdjp.user.User;
import lcdjp.user.UserRoleRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.Map;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/contact-requests")
public class ContactRequestController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(ContactRequestController.class);
    private static final int CONTACT_REQUEST_CAP = 1000;

    private final ContactRequestRepository requests;
    private final UserRoleRepository userRoles;

    public ContactRequestController(ContactRequestRepository requests, UserRoleRepository userRoles) {
        this.requests = requests;
        this.userRoles = userRoles;
    }

    @GetMapping("/incoming/{username}")
    public ResponseEntity<?> getIncomingContactRequests(@PathVariable String username) {
        try {
            ResponseEntity<?> denied = requireActor(username, false);
            if (denied != null) return denied;

            if (!requests.tableExists()) {
                return ResponseEntity.ok(List.of());
            }

            return ResponseEntity.ok(requests.findPendingFor(username, CONTACT_REQUEST_CAP));
        } catch (Exception e) {
            logger.error("❌ Error fetching contact requests: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/sent/{username}")
    public ResponseEntity<?> getSentContactRequests(@PathVariable String username) {
        try {
            ResponseEntity<?> denied = requireActor(username, false);
            if (denied != null) return denied;
            if (!requests.tableExists()) {
                return ResponseEntity.ok(List.of());
            }

            return ResponseEntity.ok(requests.findSentBy(username, CONTACT_REQUEST_CAP));
        } catch (Exception e) {
            logger.error("❌ Error fetching sent contact requests: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserContactRequests(@PathVariable String username) {
        try {
            ResponseEntity<?> denied = requireActor(username, false);
            if (denied != null) return denied;
            if (!requests.tableExists()) {
                return ResponseEntity.ok(List.of());
            }

            return ResponseEntity.ok(requests.findInvolving(username, CONTACT_REQUEST_CAP));
        } catch (Exception e) {
            logger.error("❌ Error fetching user contact requests: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping
    public ResponseEntity<?> createContactRequest(
            @Valid @RequestBody ContactRequestCreateRequest requestData) {
        try {
            String sender = authenticatedUsername();
            if (sender == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            String recipient = requestData.getRecipient();
            String message = requestData.getMessage();

            if (!requests.tableExists()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("error", "Contact requests table not configured"));
            }

            requests.insertPending(sender, recipient, message);

            return ResponseEntity.ok(Map.of("success", true, "message", "Contact request sent"));
        } catch (Exception e) {
            logger.error("❌ Error creating contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create contact request. Please try again later."));
        }
    }

    @PutMapping("/{requestId}/accept")
    public ResponseEntity<?> acceptContactRequest(@PathVariable Integer requestId) {
        try {
            Map<String, Object> request = requests.findParties(requestId);
            if (request == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Contact request not found"));
            }

            String sender = (String) request.get("sender");
            String recipient = (String) request.get("recipient");
            ResponseEntity<?> denied = requireActor(recipient, false);
            if (denied != null) return denied;

            requests.markAccepted(requestId);
            requests.notifyAccepted(sender, recipient + " has accepted your contact request.");

            return ResponseEntity.ok(Map.of("success", true, "message", "Contact request accepted"));
        } catch (Exception e) {
            logger.error("❌ Error accepting contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to accept contact request. Please try again later."));
        }
    }

    @PutMapping("/{requestId}/deny")
    public ResponseEntity<?> denyContactRequest(@PathVariable Integer requestId) {
        try {
            Map<String, Object> request = requests.findParties(requestId);
            if (request == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Contact request not found"));
            }

            String sender = (String) request.get("sender");
            String recipient = (String) request.get("recipient");
            ResponseEntity<?> denied = requireActor(recipient, false);
            if (denied != null) return denied;

            requests.markDenied(requestId);
            requests.notifyDenied(sender, "Your contact request has been declined.");

            return ResponseEntity.ok(Map.of("success", true, "message", "Contact request denied"));
        } catch (Exception e) {
            logger.error("❌ Error denying contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to deny contact request. Please try again later."));
        }
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<?> deleteContactRequest(@PathVariable Integer requestId) {
        try {
            Map<String, Object> request = requests.findParties(requestId);
            if (request == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Contact request not found"));
            }
            String actor = authenticatedUsername();
            String sender = (String) request.get("sender");
            String recipient = (String) request.get("recipient");
            if (actor == null || (!actor.equals(sender) && !actor.equals(recipient)
                    && !isAdministrator(actor))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only delete your own contact requests"));
            }
            if (requests.delete(requestId) > 0) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Contact request deleted"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Contact request not found"));
        } catch (Exception e) {
            logger.error("❌ Error deleting contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete contact request. Please try again later."));
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
        return name == null || "anonymousUser".equals(name) ? null : name;
    }

    private ResponseEntity<?> requireActor(String requested, boolean adminOnly) {
        String actor = authenticatedUsername();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        if ((adminOnly && !isAdministrator(actor))
                || (!adminOnly && !actor.equals(requested) && !isAdministrator(actor))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You may only access your own contact requests"));
        }
        return null;
    }

    private boolean isAdministrator(String username) {
        return userRoles.isAdministrator(username);
    }
}
