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

/**
 * Serves files kept in object storage. The URL is the signed, short-lived token that
 * {@link FileRefService#resolveForClient} puts in API responses, so it is only ever seen by someone the
 * owning endpoint (case, document, ...) already authorised. The existing {@code anyRequest().authenticated()}
 * rule still requires a logged-in session on top of that. Returning a {@link Resource} lets Spring answer
 * HTTP Range requests, which Safari needs to play video.
 */
@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileRefService fileRefService;

    @Autowired
    private CaseAccessService caseAccessService;

    @GetMapping("/{token:.+}")
    public ResponseEntity<Resource> get(@PathVariable String token) {
        if (caseAccessService.authenticatedUsername() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        FileRefService.Download file = fileRefService.open(token);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, file.inline() ? "inline" : "attachment")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .header("X-Content-Type-Options", "nosniff")
                .body(new ByteArrayResource(file.bytes()));
    }
}
