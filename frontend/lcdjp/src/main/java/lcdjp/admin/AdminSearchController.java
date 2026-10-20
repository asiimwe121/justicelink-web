package lcdjp.admin;

import lcdjp.ai.AiChatRequest;
import lcdjp.ai.AiChatProvider;
import lcdjp.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/search")
public class AdminSearchController {

    private static final Logger log = LoggerFactory.getLogger(AdminSearchController.class);

    private final AdminSearchService searchService;
    private final AiChatProvider chatProvider;
    private final JwtUtil jwtUtil;

    public AdminSearchController(AdminSearchService searchService, AiChatProvider chatProvider,
                                  JwtUtil jwtUtil) {
        this.searchService = searchService;
        this.chatProvider = chatProvider;
        this.jwtUtil = jwtUtil;
    }

    public record SearchRequest(String query) {}

    @PostMapping
    public ResponseEntity<Map<String, Object>> search(@RequestBody SearchRequest request,
                                                        HttpServletRequest httpRequest) {
        String query = request.query() == null ? "" : request.query().trim();

        if (query.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "reply", "Type something to search for — users, cases, LC offices, or legal organizations.",
                    "fallback", false,
                    "resultCount", 0
            ));
        }

        String callerDistrict = null;
        if (isDistrictAdmin(httpRequest)) {
            callerDistrict = extractDistrict(httpRequest);
            if (callerDistrict == null || callerDistrict.isBlank()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "reply", "Your account has no assigned district, so district search is unavailable.",
                        "fallback", false,
                        "resultCount", 0
                ));
            }
        }

        List<AdminSearchService.SearchHit> hits = searchService.search(query, callerDistrict);
        log.info("[AdminSearch] query='{}' district='{}' -> {} real record(s) matched",
                query, callerDistrict == null ? "ALL" : callerDistrict, hits.size());

        if (hits.isEmpty()) {

            String suggestion = callerDistrict != null
                    ? "Try User Management, Case records, or Legal Organizations within your district."
                    : "Try User Management, Case records, Statistics, District Admins, "
                            + "LC Offices, or Legal Organizations.";
            return ResponseEntity.ok(Map.of(
                    "reply", "No matching records found for \"" + query + "\". " + suggestion,
                    "fallback", false,
                    "resultCount", 0
            ));
        }

        String dataBlock = searchService.toContextBlock(hits);
        String groundedPrompt = "You are formatting real search results for an admin panel. Below is the ACTUAL "
                + "data retrieved from the database for the admin's query. Summarize it clearly and concisely "
                + "for the admin, grouped by type if there are several. Do not add, guess, or infer any fact "
                + "that is not present in this data. Do not mention that you are an AI model; just present the "
                + "results.\n\nRetrieved data:\n" + dataBlock;

        AiChatRequest aiRequest = new AiChatRequest();
        aiRequest.setMessage("Admin search query: " + query);
        aiRequest.setContext(groundedPrompt);
        aiRequest.setSessionId("admin-search");
        aiRequest.setDisguise(true);

        String phrased = chatProvider.chat(aiRequest);
        boolean fallback = (phrased == null || phrased.isBlank());

        String reply = fallback
                ? rawFallback(hits)
                : phrased.trim() + "\n\nAll matches:\n" + rawFallback(hits);

        return ResponseEntity.ok(Map.of(
                "reply", reply,
                "fallback", fallback,
                "resultCount", hits.size()
        ));
    }

    private String rawFallback(List<AdminSearchService.SearchHit> hits) {
        StringBuilder sb = new StringBuilder();
        for (AdminSearchService.SearchHit h : hits) {
            sb.append(h.type()).append(": ").append(h.name())

                    .append(" (").append(h.details()).append(") — see ").append(h.section()).append("\n");
        }
        return sb.toString().trim();
    }

    private boolean isDistrictAdmin(HttpServletRequest request) {
        String role = extractRole(request);
        if (role == null) return false;
        return role.trim().toUpperCase().replace(' ', '_').equals("DISTRICT_ADMIN");
    }

    private String extractRole(HttpServletRequest request) {
        String token = bearerToken(request);
        if (token == null) return null;
        try {
            return jwtUtil.extractRole(token);
        } catch (Exception e) {
            return null;
        }
    }

    private String extractDistrict(HttpServletRequest request) {
        String token = bearerToken(request);
        if (token == null) return null;
        try {
            return jwtUtil.extractDistrict(token);
        } catch (Exception e) {
            return null;
        }
    }

    private String bearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        return authHeader.substring(7).trim();
    }
}
