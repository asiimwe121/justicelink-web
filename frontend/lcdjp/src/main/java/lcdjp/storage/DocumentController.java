package lcdjp.storage;

import lcdjp.admin.AuditLogService;
import lcdjp.security.RoleAuthority;
import lcdjp.user.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth/documents")
public class DocumentController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DocumentController.class);
    private static final int DOCUMENT_LIST_CAP = 1000;

    @Autowired
    private DocumentRepository documents;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private FileRefService fileRefService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(@Valid @RequestBody DocumentUploadRequest body) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();

            String fileName    = body.getFile_name();
            String fileData    = body.getFile_data();

            // The browser's own file_type / file_size are not trusted: type and size are re-derived here.
            DocumentUploadValidator.Result verified;
            try {
                verified = DocumentUploadValidator.validate(fileName, fileData);
            } catch (DocumentUploadValidator.InvalidUploadException invalid) {
                return ResponseEntity.badRequest().body(Map.of("error", invalid.getMessage()));
            }
            String fileType    = verified.mimeType();
            long   fileSize    = verified.sizeBytes();

            String owner       = actor;
            String caseId      = body.getCase_id();
            String category    = body.getCategory();
            String description = body.getDescription();

            if (caseId != null && !caseId.isBlank() && !canAccessCase(actor, caseId)) {
                return forbidden("You do not have access to this case");
            }

            // With object storage configured the bytes go to the bucket and the column keeps a short reference;
            // otherwise (or if the bucket is unreachable) storedData is the data URI, exactly as before.
            final String storedData = fileRefService.externalizeIfDataUri(fileData, "documents");

            long docId;
            try {
                docId = documents.insert(fileName, fileType, fileSize, storedData, owner, caseId,
                        category != null ? category : "general", description);
            } catch (RuntimeException insertFailed) {
                fileRefService.deleteQuietly(storedData);
                throw insertFailed;
            }

            logger.info("✅ Document uploaded: " + fileName + " (id=" + docId + ") by " + owner);

            if (caseId != null && !caseId.isBlank()) {
                auditLogService.logAction(owner, null, "DOCUMENT_UPLOADED", "document", caseId,
                        fileName + " (doc id " + docId + ")");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document uploaded successfully");
            response.put("id", docId);

            Map<String, Object> created = documents.findById(docId);
            if (created != null) {
                response.put("document", created);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Error uploading document: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Upload failed. Please try again later."));
        }
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserDocuments(@PathVariable String username) {
        try {

            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();
            if (!actor.equals(username) && !isAdministrator(actor)) {
                return forbidden("You can only view your own documents");
            }

            List<Map<String, Object>> docs = documents.findVisibleToUser(username, DOCUMENT_LIST_CAP);

            logger.info("✅ Retrieved " + docs.size() + " documents for user: " + username);
            return ResponseEntity.ok(docs);

        } catch (Exception e) {
            logger.error("❌ Error fetching user documents: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @GetMapping("/case/{caseId}")
    public ResponseEntity<?> getCaseDocuments(@PathVariable String caseId) {
        try {

            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();
            if (!canAccessCase(actor, caseId)) {
                return forbidden("You do not have access to this case");
            }

            List<Map<String, Object>> docs = documents.findByCase(caseId, DOCUMENT_LIST_CAP);

            logger.info("✅ Retrieved " + docs.size() + " documents for case: " + caseId);
            return ResponseEntity.ok(Map.of("success", true, "documents", docs));

        } catch (Exception e) {
            logger.error("❌ Error fetching case documents: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @GetMapping("/case/{caseId}/log")
    public ResponseEntity<?> getDocumentLogForCase(@PathVariable String caseId) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();
            if (!canAccessCase(actor, caseId)) {
                return forbidden("You do not have access to this case");
            }

            List<Map<String, Object>> logs = documents.findAuditLogs(caseId);
            return ResponseEntity.ok(Map.of("success", true, "logs", logs));
        } catch (Exception e) {
            logger.error("❌ Error fetching document log: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @GetMapping("/{docId}")
    public ResponseEntity<?> getDocument(@PathVariable String docId, Authentication authentication) {
        try {

            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();

            Map<String, Object> doc = documentRow(docId);
            if (doc == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }
            if (!canAccessDocument(actor, doc)) {
                return forbidden("You do not have access to this document");
            }

            Object caseId = doc.get("case_id");
            if (caseId != null && !String.valueOf(caseId).isBlank()) {
                auditLogService.logAction(actor, null, "DOCUMENT_VIEWED", "document", String.valueOf(caseId),
                        doc.get("file_name") + " (doc id " + docId + ")");
            }

            return ResponseEntity.ok(Map.of("success", true, "document", doc));

        } catch (Exception e) {
            logger.error("❌ Error fetching document: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @DeleteMapping("/{docId}")
    public ResponseEntity<?> deleteDocument(@PathVariable String docId, Authentication authentication) {
        try {

            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();

            Map<String, Object> existingDoc = documentRow(docId);
            if (existingDoc == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }

            if (!actor.equals(strVal(existingDoc.get("owner"))) && !isAdministrator(actor)) {
                return forbidden("You do not have permission to delete this document");
            }

            int deleted = documents.delete(docId);

            if (deleted > 0) {
                fileRefService.deleteQuietly(existingDoc.get("file_data"));
                logger.info("✅ Document deleted: " + docId);
                Object caseId = existingDoc.get("case_id");
                if (caseId != null && !String.valueOf(caseId).isBlank()) {
                    auditLogService.logAction(actor, null, "DOCUMENT_DELETED", "document", String.valueOf(caseId),
                            existingDoc.get("file_name") + " (doc id " + docId + ")");
                }
                return ResponseEntity.ok(Map.of("success", true, "message", "Document deleted"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Document not found"));

        } catch (Exception e) {
            logger.error("❌ Error deleting document: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @PostMapping("/{docId}/share")
    public ResponseEntity<?> shareDocument(
            @PathVariable String docId,
            @Valid @RequestBody ShareDocumentRequest body) {
        try {

            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();

            String addUser = body.getSharedWith();

            Map<String, Object> doc = documentRow(docId);
            if (doc == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }

            if (!actor.equals(strVal(doc.get("owner"))) && !isAdministrator(actor)) {
                return forbidden("You do not have permission to share this document");
            }

            String current = strVal(doc.get("shared_with"));
            String updated = addToList(current, addUser);

            documents.updateSharedWith(docId, updated);

            logger.info("✅ Document " + docId + " shared with: " + addUser);
            return ResponseEntity.ok(Map.of("success", true, "message", "Document shared successfully"));

        } catch (Exception e) {
            logger.error("❌ Error sharing document: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @PostMapping("/{docId}/unshare")
    public ResponseEntity<?> unshareDocument(
            @PathVariable String docId,
            @RequestBody UnshareDocumentRequest body) {
        try {

            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();

            String removeUser     = body.getRemoveUser();
            String precomputedList = body.getShared_with();

            Map<String, Object> doc = documentRow(docId);
            if (doc == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Document not found"));
            }

            boolean selfRemoval = removeUser != null && actor.equals(removeUser.trim());
            if (!selfRemoval && !actor.equals(strVal(doc.get("owner"))) && !isAdministrator(actor)) {
                return forbidden("You do not have permission to modify sharing for this document");
            }

            String newList;
            if (removeUser != null && !removeUser.isBlank()) {

                String current = strVal(doc.get("shared_with"));
                newList = removeFromList(current, removeUser);
            } else if (precomputedList != null) {

                newList = precomputedList;
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "removeUser or shared_with is required"));
            }

            documents.updateSharedWith(docId, newList);

            logger.info("✅ Document " + docId + " unshared from: " + removeUser);
            return ResponseEntity.ok(Map.of("success", true, "message", "User removed from shared access"));

        } catch (Exception e) {
            logger.error("❌ Error unsharing document: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    private String authenticatedUsername() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) return null;
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) return ((User) principal).getUsername();
            String name = authentication.getName();
            return name == null || "anonymousUser".equals(name) ? null : name;
        } catch (Exception e) {
            logger.error("❌ Error getting authenticated username: " + e.getMessage());
            return null;
        }
    }

    private String strVal(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private Map<String, Object> userRow(String username) {
        Map<String, Object> row = documents.findUserRoleRow(username);
        return row == null ? Map.of("username", username) : row;
    }

    private boolean isAdministrator(String username) {
        if (username == null) return false;
        return RoleAuthority.isAdministratorRole(strVal(userRow(username).get("role")));
    }

    private Map<String, Object> caseRow(String caseId) {
        if (caseId == null || caseId.isBlank()) return null;
        return documents.findCaseByReference(caseId);
    }

    private boolean canAccessCase(String username, String caseId) {
        if (username == null) return false;
        if (isAdministrator(username)) return true;
        Map<String, Object> row = caseRow(caseId);
        if (row == null) return false;
        return username.equals(strVal(row.get("citizen_id")))
                || username.equals(strVal(row.get("current_handler")))
                || username.equals(strVal(row.get("assigned_lc")))
                || username.equals(strVal(row.get("assigned_lawyer")))
                || username.equals(strVal(row.get("selected_lawyer")))
                || username.equals(strVal(row.get("assigned_org")));
    }

    private Map<String, Object> documentRow(String docId) {
        return documents.findById(docId);
    }

    private boolean canAccessDocument(String username, Map<String, Object> doc) {
        if (username == null || doc == null) return false;
        if (isAdministrator(username)) return true;
        if (username.equals(strVal(doc.get("owner")))) return true;
        String caseId = strVal(doc.get("case_id"));
        if (!caseId.isBlank() && canAccessCase(username, caseId)) return true;
        String sharedWith = strVal(doc.get("shared_with"));
        if (!sharedWith.isBlank()) {
            for (String u : sharedWith.split(",")) {
                if (username.equals(u.trim())) return true;
            }
        }
        return false;
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
    }

    private ResponseEntity<?> forbidden(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", message));
    }

    private String getStr(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : (v != null ? v.toString() : null);
    }

    private long getLong(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v instanceof Number) return ((Number) v).longValue();
        if (v instanceof String) {
            try {
                return Long.parseLong((String) v);
            } catch (NumberFormatException e) {
                logger.debug("ignoring non-numeric value for '{}'", key);
            }
        }
        return 0L;
    }

    private String addToList(String current, String username) {
        if (current == null || current.isBlank()) return username.trim();
        List<String> users = Arrays.stream(current.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        if (!users.contains(username.trim())) {
            users.add(username.trim());
        }
        return String.join(",", users);
    }

    private String removeFromList(String current, String username) {
        if (current == null || current.isBlank()) return "";
        return Arrays.stream(current.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty() && !s.equals(username.trim()))
                .collect(Collectors.joining(","));
    }
}
