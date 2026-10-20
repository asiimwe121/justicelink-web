package lcdjp.admin;

import lcdjp.cases.Case;
import lcdjp.cases.CaseRepository;
import lcdjp.legal.LegalOrganization;
import lcdjp.legal.LegalOrganizationRepository;
import lcdjp.user.User;
import lcdjp.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AdminSearchService {

    private static final int MAX_PER_CATEGORY = 10;

    private final UserRepository userRepository;
    private final CaseRepository caseRepository;
    private final LegalOrganizationRepository legalOrganizationRepository;

    public AdminSearchService(UserRepository userRepository,
                               CaseRepository caseRepository,
                               LegalOrganizationRepository legalOrganizationRepository) {
        this.userRepository = userRepository;
        this.caseRepository = caseRepository;
        this.legalOrganizationRepository = legalOrganizationRepository;
    }

    public List<SearchHit> search(String rawQuery) {
        return search(rawQuery, null);
    }

    public List<SearchHit> search(String rawQuery, String district) {
        String q = rawQuery == null ? "" : rawQuery.trim();
        List<SearchHit> hits = new ArrayList<>();
        if (q.isEmpty()) return hits;

        boolean scoped = district != null && !district.isBlank();
        Pageable limit = PageRequest.of(0, MAX_PER_CATEGORY);

        for (User u : userRepository.searchUsers(q, limit)) {
            if (scoped && !district.equalsIgnoreCase(nullToEmpty(u.getDistrict()))) continue;
            String name = ((u.getFirstName() != null ? u.getFirstName() : "") + " " +
                    (u.getLastName() != null ? u.getLastName() : "")).trim();
            hits.add(new SearchHit(
                    "User",
                    name.isEmpty() ? u.getUsername() : name,
                    String.format("username=%s | role=%s | email=%s | phone=%s | district=%s | status=%s",
                            nullSafe(u.getUsername()), nullSafe(u.getRole()), nullSafe(u.getEmail()),
                            nullSafe(u.getPhone()), nullSafe(u.getDistrict()), nullSafe(u.getApprovalStatus())),
                    "User Management"
            ));
        }

        for (Case c : caseRepository.searchCases(q, limit)) {
            if (scoped && !district.equalsIgnoreCase(nullToEmpty(c.getDistrict()))) continue;
            hits.add(new SearchHit(
                    "Case",
                    nullSafe(c.getCaseNumber() != null ? c.getCaseNumber() : c.getCaseReference()),
                    String.format("title=%s | type=%s | status=%s | citizen=%s | assignedTo=%s | district=%s",
                            nullSafe(c.getTitle()), nullSafe(c.getCaseType()),
                            c.getCaseStatus() != null ? c.getCaseStatus().toString() : "UNKNOWN",
                            nullSafe(c.getCitizenName()), nullSafe(c.getAssignedTo()), nullSafe(c.getDistrict())),
                    "Case records"
            ));
        }

        for (LegalOrganization o : legalOrganizationRepository.searchOrganizations(q, limit)) {
            if (scoped && !district.equalsIgnoreCase(nullToEmpty(o.getDistrict()))) continue;
            hits.add(new SearchHit(
                    "Legal Organization",
                    nullSafe(o.getOrgName()),
                    String.format("type=%s | district=%s | specialization=%s | phone=%s | approval=%s",
                            nullSafe(o.getOrgType()), nullSafe(o.getDistrict()),
                            nullSafe(o.getSpecialization()), nullSafe(o.getPhone()), nullSafe(o.getApprovalStatus())),
                    "Legal Organizations"
            ));
        }

        return hits;
    }

    public String toContextBlock(List<SearchHit> hits) {
        if (hits.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (SearchHit h : hits) {
            sb.append("- [").append(h.type()).append("] ").append(h.name())
                    .append(" — ").append(h.details()).append("\n");
        }
        return sb.toString();
    }

    private static String nullSafe(String s) {
        return (s == null || s.isBlank()) ? "—" : s;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    public record SearchHit(String type, String name, String details, String section) {}
}
