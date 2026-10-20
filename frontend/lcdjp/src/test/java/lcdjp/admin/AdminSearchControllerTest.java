package lcdjp.admin;

import lcdjp.ai.AiChatProvider;
import lcdjp.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSearchControllerTest {

    @Mock private AdminSearchService searchService;
    @Mock private AiChatProvider chatProvider;
    @Mock private JwtUtil jwtUtil;
    @Mock private HttpServletRequest httpRequest;

    @InjectMocks
    private AdminSearchController controller;

    @Test
    void search_blankQuery_returnsPromptWithoutCallingSearchService() {
        ResponseEntity<Map<String, Object>> result = controller.search(new AdminSearchController.SearchRequest("   "), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(0, result.getBody().get("resultCount"));
        verifyNoInteractions(searchService);
    }

    @Test
    void search_nonAdminCaller_searchesAcrossAllDistricts() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer sometoken");
        when(jwtUtil.extractRole("sometoken")).thenReturn("SYSTEM_ADMIN");
        when(searchService.search("users", null)).thenReturn(List.of());

        ResponseEntity<Map<String, Object>> result = controller.search(new AdminSearchController.SearchRequest("users"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(searchService).search("users", null);
    }

    @Test
    void search_districtAdminWithDistrict_scopesSearchToTheirDistrict() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer sometoken");
        when(jwtUtil.extractRole("sometoken")).thenReturn("DISTRICT_ADMIN");
        when(jwtUtil.extractDistrict("sometoken")).thenReturn("Kampala");
        when(searchService.search("cases", "Kampala")).thenReturn(List.of());

        ResponseEntity<Map<String, Object>> result = controller.search(new AdminSearchController.SearchRequest("cases"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(searchService).search("cases", "Kampala");
    }

    @Test
    void search_districtAdminWithoutDistrict_isForbidden_notSearchedGlobally() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer sometoken");
        when(jwtUtil.extractRole("sometoken")).thenReturn("DISTRICT_ADMIN");
        when(jwtUtil.extractDistrict("sometoken")).thenReturn(null);

        ResponseEntity<Map<String, Object>> result = controller.search(new AdminSearchController.SearchRequest("cases"), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(searchService);
    }

    @Test
    void search_noHits_returnsHelpfulReplyWithoutCallingAiService() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);
        when(searchService.search("zzz", null)).thenReturn(List.of());

        ResponseEntity<Map<String, Object>> result = controller.search(new AdminSearchController.SearchRequest("zzz"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(0, result.getBody().get("resultCount"));
        assertTrue(((String) result.getBody().get("reply")).contains("No matching records"));
        verifyNoInteractions(chatProvider);
    }

    @Test
    void search_hitsFound_aiUnavailable_fallsBackToRawSummary() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);
        AdminSearchService.SearchHit hit = new AdminSearchService.SearchHit("User", "Jane Doe", "jane@x.com", "User Management");
        when(searchService.search("jane", null)).thenReturn(List.of(hit));
        when(searchService.toContextBlock(List.of(hit))).thenReturn("User: Jane Doe");
        when(chatProvider.chat(any())).thenReturn(null);

        ResponseEntity<Map<String, Object>> result = controller.search(new AdminSearchController.SearchRequest("jane"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(true, result.getBody().get("fallback"));
        assertEquals(1, result.getBody().get("resultCount"));
        assertTrue(((String) result.getBody().get("reply")).contains("Jane Doe"));
    }

    @Test
    void search_hitsFound_aiRepliesSensibly_appendsAllMatches() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);
        AdminSearchService.SearchHit hit = new AdminSearchService.SearchHit("User", "Jane Doe", "jane@x.com", "User Management");
        when(searchService.search("jane", null)).thenReturn(List.of(hit));
        when(searchService.toContextBlock(List.of(hit))).thenReturn("User: Jane Doe");
        when(chatProvider.chat(any())).thenReturn(" Found one user matching \"jane\". ");

        ResponseEntity<Map<String, Object>> result = controller.search(new AdminSearchController.SearchRequest("jane"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(false, result.getBody().get("fallback"));
        String reply = (String) result.getBody().get("reply");
        assertTrue(reply.startsWith("Found one user matching"));
        assertTrue(reply.contains("All matches:"));
    }
}
