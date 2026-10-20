package lcdjp.cases;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CaseRepository extends JpaRepository<Case, Long> {

    @Query("SELECT c FROM Case c WHERE c.caseStatus = 'PENDING' OR c.caseStatus = 'UNDER_REVIEW' OR c.caseStatus = 'IN_PROGRESS'")
    List<Case> findOpenCases();

    @Query("SELECT COUNT(c) FROM Case c WHERE c.caseStatus != 'CLOSED' AND c.caseStatus != 'RESOLVED'")
    Long countOpenCases();

    Optional<Case> findByCaseNumber(String caseNumber);

    List<Case> findByCitizenIdOrderByCreatedAtDesc(String citizenId);

    List<Case> findByAssignedTo(String assignedTo);

    List<Case> findByCaseStatus(CaseStatus status);

    @Query("SELECT c FROM Case c WHERE " +
            "LOWER(c.caseNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.caseReference) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.caseType) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.citizenName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.citizenPhone) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.assignedTo) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.district) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Case> searchCases(@Param("q") String q, Pageable pageable);

}