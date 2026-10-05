package lcdjp;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LegalOrganizationRepository extends JpaRepository<LegalOrganization, Long> {

    @Query("SELECT o FROM LegalOrganization o WHERE " +
            "LOWER(o.orgName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(o.orgType) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(o.district) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(o.specialization) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<LegalOrganization> searchOrganizations(@Param("q") String q, Pageable pageable);
}