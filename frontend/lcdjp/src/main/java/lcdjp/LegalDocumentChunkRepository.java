package lcdjp;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Repository
public interface LegalDocumentChunkRepository extends JpaRepository<LegalDocumentChunk, Long> {

    List<LegalDocumentChunk> findBySourceDocumentId(String sourceDocumentId);

    @Query("SELECT COALESCE(MAX(c.id), 0) FROM LegalDocumentChunk c")
    long findMaxId();

    @Transactional
    @Modifying
    @Query("DELETE FROM LegalDocumentChunk c WHERE c.sourceDocumentId = :sourceDocumentId")
    void deleteBySourceDocumentId(@Param("sourceDocumentId") String sourceDocumentId);
}
