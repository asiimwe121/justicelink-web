package lcdjp.storage;

import lcdjp.admin.AuditLogService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentControllerTest {

    @Mock private DocumentRepository documents;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private DocumentController controller;

    @BeforeEach
    void wireFileRefService() {
        // Object storage is not configured in tests, so files stay inline exactly as before.
        ReflectionTestUtils.setField(controller, "fileRefService",
                new FileRefService(new ObjectStorageService("", "", "", "", ""), "", ""));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, "pw", List.of()));
    }

    private void stubRole(String username, String role) {
        when(documents.findUserRoleRow(username)).thenReturn(Map.of("username", username, "role", role));
    }

    private Map<String, Object> caseRow(String caseId, String citizen, String handler) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("case_reference", caseId);
        row.put("citizen_id", citizen);
        row.put("current_handler", handler);
        row.put("assigned_lc", "");
        row.put("assigned_lawyer", "");
        row.put("selected_lawyer", "");
        row.put("assigned_org", "");
        return row;
    }

    private void stubCase(String caseId, Map<String, Object> row) {
        when(documents.findCaseByReference(caseId)).thenReturn(row);
    }

    private Map<String, Object> docRow(long id, String owner, String caseId, String sharedWith) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("owner", owner);
        row.put("case_id", caseId);
        row.put("shared_with", sharedWith == null ? "" : sharedWith);
        row.put("file_name", "affidavit.pdf");
        return row;
    }

    private void stubDoc(String docId, Map<String, Object> row) {
        when(documents.findById(docId)).thenReturn(row);
    }

    private DocumentUploadRequest uploadRequest(String fileName, String caseId) {
        DocumentUploadRequest req = new DocumentUploadRequest();
        req.setFile_name(fileName);
        req.setFile_type("application/pdf");
        req.setFile_size(1024L);
        req.setFile_data("data:application/pdf;base64,"
                + java.util.Base64.getEncoder().encodeToString("%PDF-1.4 test".getBytes()));
        req.setCase_id(caseId);
        req.setDescription("desc");
        return req;
    }

    @Test
    void upload_noAuth_returns401() {
        ResponseEntity<?> result = controller.uploadDocument(uploadRequest("f.pdf", null));

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(documents);
    }

    @Test
    void upload_disallowedFileType_returns400_andNeverTouchesTheDatabase() {
        authenticateAs("alice");
        DocumentUploadRequest req = uploadRequest("evil.html", null);
        req.setFile_data("data:text/html;base64,"
                + java.util.Base64.getEncoder().encodeToString("<script>x</script>".getBytes()));

        ResponseEntity<?> result = controller.uploadDocument(req);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(documents, never()).insert(any(), any(), anyLong(), any(), any(), any(), any(), any());
    }

    @Test
    void upload_contentNotMatchingDeclaredType_returns400() {
        authenticateAs("alice");
        DocumentUploadRequest req = uploadRequest("fake.pdf", null);
        req.setFile_data("data:application/pdf;base64,"
                + java.util.Base64.getEncoder().encodeToString("MZ-not-a-pdf-at-all".getBytes()));

        ResponseEntity<?> result = controller.uploadDocument(req);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(documents, never()).insert(any(), any(), anyLong(), any(), any(), any(), any(), any());
    }

    @Test
    void upload_withCaseIdButNoAccess_returns403() {
        authenticateAs("mallory");
        stubRole("mallory", "Citizen");
        stubCase("CASE-1", caseRow("CASE-1", "otherCitizen", "someHandler"));

        ResponseEntity<?> result = controller.uploadDocument(uploadRequest("f.pdf", "CASE-1"));

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(documents, never()).insert(any(), any(), anyLong(), any(), any(), any(), any(), any());
    }

    @Test
    void upload_success_insertsAndReturnsGeneratedDocument() {
        authenticateAs("alice");

        when(documents.insert(any(), any(), anyLong(), any(), any(), any(), any(), any())).thenReturn(42L);
        when(documents.findById(42L)).thenReturn(docRow(42L, "alice", null, ""));

        ResponseEntity<?> result = controller.uploadDocument(uploadRequest("f.pdf", null));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        assertEquals(42L, ((Number) body.get("id")).longValue());
        assertNotNull(body.get("document"));
        verifyNoInteractions(auditLogService);
    }

    @Test
    void upload_successWithCaseId_logsAudit() {
        authenticateAs("alice");
        stubRole("alice", "Citizen");
        stubCase("CASE-1", caseRow("CASE-1", "alice", ""));

        when(documents.insert(any(), any(), anyLong(), any(), any(), any(), any(), any())).thenReturn(7L);
        when(documents.findById(7L)).thenReturn(docRow(7L, "alice", "CASE-1", ""));

        ResponseEntity<?> result = controller.uploadDocument(uploadRequest("f.pdf", "CASE-1"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(
                eq("alice"), isNull(), eq("DOCUMENT_UPLOADED"), eq("document"), eq("CASE-1"), anyString());
    }

    @Test
    void upload_dbError_returns500() {
        authenticateAs("alice");
        when(documents.insert(any(), any(), anyLong(), any(), any(), any(), any(), any())).thenThrow(new RuntimeException("db down"));

        ResponseEntity<?> result = controller.uploadDocument(uploadRequest("f.pdf", null));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    @Test
    void getUserDocuments_noAuth_returns401() {
        ResponseEntity<?> result = controller.getUserDocuments("alice");
        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getUserDocuments_differentNonAdminUser_returns403() {
        authenticateAs("mallory");
        stubRole("mallory", "Citizen");

        ResponseEntity<?> result = controller.getUserDocuments("alice");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getUserDocuments_ownDocuments_returnsList() {
        authenticateAs("alice");
        when(documents.findVisibleToUser("alice", 1000))
                .thenReturn(List.of(docRow(1L, "alice", null, "")));

        ResponseEntity<?> result = controller.getUserDocuments("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(1, ((List<?>) result.getBody()).size());
    }

    @Test
    void getUserDocuments_adminViewingOtherUser_returnsList() {
        authenticateAs("admin1");
        stubRole("admin1", "Admin");
        when(documents.findVisibleToUser("alice", 1000))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.getUserDocuments("alice");

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getUserDocuments_dbError_returns500() {
        authenticateAs("alice");
        when(documents.findVisibleToUser("alice", 1000))
                .thenThrow(new RuntimeException("db down"));

        ResponseEntity<?> result = controller.getUserDocuments("alice");

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    @Test
    void getCaseDocuments_noAuth_returns401() {
        ResponseEntity<?> result = controller.getCaseDocuments("CASE-1");
        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getCaseDocuments_noAccess_returns403() {
        authenticateAs("mallory");
        stubRole("mallory", "Citizen");
        stubCase("CASE-1", caseRow("CASE-1", "otherCitizen", ""));

        ResponseEntity<?> result = controller.getCaseDocuments("CASE-1");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getCaseDocuments_withAccess_returnsList() {
        authenticateAs("alice");
        stubRole("alice", "Citizen");
        stubCase("CASE-1", caseRow("CASE-1", "alice", ""));
        when(documents.findByCase("CASE-1", 1000))
                .thenReturn(List.of(docRow(1L, "alice", "CASE-1", "")));

        ResponseEntity<?> result = controller.getCaseDocuments("CASE-1");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
    }

    @Test
    void getDocumentLog_noAccess_returns403() {
        authenticateAs("mallory");
        stubRole("mallory", "Citizen");
        stubCase("CASE-1", caseRow("CASE-1", "otherCitizen", ""));

        ResponseEntity<?> result = controller.getDocumentLogForCase("CASE-1");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getDocumentLog_withAccess_returnsLogs() {
        authenticateAs("alice");
        stubRole("alice", "Citizen");
        stubCase("CASE-1", caseRow("CASE-1", "alice", ""));
        when(documents.findAuditLogs("CASE-1"))
                .thenReturn(List.of(Map.of("action", "DOCUMENT_UPLOADED")));

        ResponseEntity<?> result = controller.getDocumentLogForCase("CASE-1");

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getDocument_noAuth_returns401() {
        ResponseEntity<?> result = controller.getDocument("1", null);
        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getDocument_notFound_returns404() {
        authenticateAs("alice");
        stubDoc("1", null);

        ResponseEntity<?> result = controller.getDocument("1", null);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void getDocument_noAccess_returns403() {
        authenticateAs("mallory");
        stubRole("mallory", "Citizen");
        stubDoc("1", docRow(1L, "alice", null, ""));

        ResponseEntity<?> result = controller.getDocument("1", null);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getDocument_ownerAccess_returnsDocumentAndSkipsAuditWhenNoCase() {
        authenticateAs("alice");
        stubDoc("1", docRow(1L, "alice", null, ""));

        ResponseEntity<?> result = controller.getDocument("1", null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void getDocument_sharedUserAccess_logsAuditWhenCasePresent() {
        authenticateAs("bob");
        stubDoc("1", docRow(1L, "alice", "CASE-1", "bob,carol"));

        ResponseEntity<?> result = controller.getDocument("1", null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(
                eq("bob"), isNull(), eq("DOCUMENT_VIEWED"), eq("document"), eq("CASE-1"), anyString());
    }

    @Test
    void delete_noAuth_returns401() {
        ResponseEntity<?> result = controller.deleteDocument("1", null);
        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void delete_notFound_returns404() {
        authenticateAs("alice");
        stubDoc("1", null);

        ResponseEntity<?> result = controller.deleteDocument("1", null);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void delete_notOwnerNotAdmin_returns403() {
        authenticateAs("mallory");
        stubDoc("1", docRow(1L, "alice", null, ""));
        stubRole("mallory", "Citizen");

        ResponseEntity<?> result = controller.deleteDocument("1", null);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(documents, never()).delete(anyString());
    }

    @Test
    void delete_ownerSuccess_logsAuditWhenCasePresent() {
        authenticateAs("alice");
        stubDoc("1", docRow(1L, "alice", "CASE-1", ""));
        when(documents.delete("1")).thenReturn(1);

        ResponseEntity<?> result = controller.deleteDocument("1", null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(
                eq("alice"), isNull(), eq("DOCUMENT_DELETED"), eq("document"), eq("CASE-1"), anyString());
    }

    @Test
    void delete_zeroRowsAffected_returns404() {
        authenticateAs("alice");
        stubDoc("1", docRow(1L, "alice", null, ""));
        when(documents.delete("1")).thenReturn(0);

        ResponseEntity<?> result = controller.deleteDocument("1", null);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    private ShareDocumentRequest shareRequest(String sharedWith) {
        ShareDocumentRequest req = new ShareDocumentRequest();
        req.setSharedWith(sharedWith);
        return req;
    }

    @Test
    void share_noAuth_returns401() {
        ResponseEntity<?> result = controller.shareDocument("1", shareRequest("bob"));
        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void share_notFound_returns404() {
        authenticateAs("alice");
        stubDoc("1", null);

        ResponseEntity<?> result = controller.shareDocument("1", shareRequest("bob"));

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void share_notOwnerNotAdmin_returns403() {
        authenticateAs("mallory");
        stubDoc("1", docRow(1L, "alice", null, ""));
        stubRole("mallory", "Citizen");

        ResponseEntity<?> result = controller.shareDocument("1", shareRequest("bob"));

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void share_ownerSuccess_addsUserToSharedList() {
        authenticateAs("alice");
        stubDoc("1", docRow(1L, "alice", null, "carol"));

        ResponseEntity<?> result = controller.shareDocument("1", shareRequest("bob"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(documents).updateSharedWith("1", "carol,bob");
    }

    @Test
    void share_alreadySharedUser_doesNotDuplicate() {
        authenticateAs("alice");
        stubDoc("1", docRow(1L, "alice", null, "bob"));

        ResponseEntity<?> result = controller.shareDocument("1", shareRequest("bob"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(documents).updateSharedWith("1", "bob");
    }

    private UnshareDocumentRequest unshareRequest(String removeUser, String sharedWith) {
        UnshareDocumentRequest req = new UnshareDocumentRequest();
        req.setRemoveUser(removeUser);
        req.setShared_with(sharedWith);
        return req;
    }

    @Test
    void unshare_noAuth_returns401() {
        ResponseEntity<?> result = controller.unshareDocument("1", unshareRequest("bob", null));
        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void unshare_notFound_returns404() {
        authenticateAs("alice");
        stubDoc("1", null);

        ResponseEntity<?> result = controller.unshareDocument("1", unshareRequest("bob", null));

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void unshare_notOwnerNotAdminNotSelf_returns403() {
        authenticateAs("mallory");
        stubDoc("1", docRow(1L, "alice", null, "mallory,bob"));
        stubRole("mallory", "Citizen");

        ResponseEntity<?> result = controller.unshareDocument("1", unshareRequest("bob", null));

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void unshare_selfRemoval_allowedEvenWithoutOwnership() {
        authenticateAs("bob");
        stubDoc("1", docRow(1L, "alice", null, "bob,carol"));

        ResponseEntity<?> result = controller.unshareDocument("1", unshareRequest("bob", null));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(documents).updateSharedWith("1", "carol");
    }

    @Test
    void unshare_neitherRemoveUserNorSharedWithSupplied_returns400() {
        authenticateAs("alice");
        stubDoc("1", docRow(1L, "alice", null, "bob"));

        ResponseEntity<?> result = controller.unshareDocument("1", unshareRequest(null, null));

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(documents, never()).updateSharedWith(anyString(), anyString());
    }

    @Test
    void unshare_precomputedListOverridesDirectly() {
        authenticateAs("alice");
        stubDoc("1", docRow(1L, "alice", null, "bob,carol"));

        ResponseEntity<?> result = controller.unshareDocument("1", unshareRequest(null, "carol"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(documents).updateSharedWith("1", "carol");
    }
}
