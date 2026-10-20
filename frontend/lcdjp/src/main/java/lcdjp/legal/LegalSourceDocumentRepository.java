package lcdjp.legal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface LegalSourceDocumentRepository extends JpaRepository<LegalSourceDocument, Long> {
    Optional<LegalSourceDocument> findBySourceDocumentId(String sourceDocumentId);
    Optional<LegalSourceDocument> findByRelativeSourcePath(String relativeSourcePath);
}
