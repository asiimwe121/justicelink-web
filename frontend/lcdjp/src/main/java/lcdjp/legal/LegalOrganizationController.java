package lcdjp.legal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/legal-orgs")

public class LegalOrganizationController {

    @Autowired
    private LegalOrganizationRepository repository;

    @GetMapping("/all")
    public List<LegalOrganization> getAllOrganizations() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrganization(@PathVariable Long id) {
        return repository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Organization not found")));
    }

    @PostMapping
    public LegalOrganization createOrganization(@RequestBody LegalOrganization organization) {
        return repository.save(organization);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOrganization(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "error", "Organization not found"));
        }
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Organization deleted"));
    }
}