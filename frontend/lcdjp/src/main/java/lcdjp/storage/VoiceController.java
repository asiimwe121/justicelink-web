package lcdjp.storage;

import lcdjp.cases.CaseAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Serves stored voice recordings. Returning a {@link Resource} lets Spring MVC answer
 * HTTP Range requests, which Safari/iOS require before it will play an {@code <audio>} source.
 * Covered by the existing {@code anyRequest().authenticated()} rule in SecurityConfig.
 */
@RestController
@RequestMapping("/api/voice")
public class VoiceController {

    @Autowired
    private VoiceStorageService voiceStorage;

    @Autowired
    private CaseAccessService caseAccessService;

    @GetMapping("/{id}")
    public ResponseEntity<Resource> get(@PathVariable long id) {
        String actor = caseAccessService.authenticatedUsername();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Map<String, Object> row = voiceStorage.findMetadata(id);
        if (row == null) {
            return ResponseEntity.notFound().build();
        }
        if (!canListen(actor, row)) {
            // Same answer as "missing" so ids cannot be probed.
            return ResponseEntity.notFound().build();
        }
        byte[] data = voiceStorage.findData(id);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(String.valueOf(row.get("mime_type"))))
                .header(HttpHeaders.CACHE_CONTROL, "private, no-cache")
                .header("X-Content-Type-Options", "nosniff")
                .body(new ByteArrayResource(data));
    }

    private boolean canListen(String actor, Map<String, Object> row) {
        String kind = String.valueOf(row.get("kind"));
        if (actor.equals(row.get("uploader"))) {
            return true;
        }
        if ("CHAT".equals(kind)) {
            if (actor.equals(row.get("recipient"))) return true;
            String role = caseAccessService.authenticatedRole();
            String normalized = role == null ? "" : role.trim().toUpperCase().replace(' ', '_');
            return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                    || normalized.equals("SYSTEM_ADMINISTRATOR");
        }
        Object ref = row.get("case_reference");
        if (ref == null) return false;
        Map<String, Object> caseRow = caseAccessService.singleCase(ref.toString());
        return caseRow != null && (caseAccessService.canAccessCase(actor, caseRow)
                || caseAccessService.isAssignedLcForCase(actor, caseRow));
    }
}
