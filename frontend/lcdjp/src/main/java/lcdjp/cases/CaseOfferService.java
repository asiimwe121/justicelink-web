package lcdjp.cases;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.stream.Collectors;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Offering a case to approved lawyers: detention alerts, picking the next lawyer by workload, and
 * the "the system matched this case to you" notification.
 */
@Service
public class CaseOfferService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseOfferService.class);

    private final JdbcTemplate jdbcTemplate;

    public CaseOfferService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Tells approved lawyers in the district that a detention report needs urgent attention. No names are sent. */
    public void alertLawyersOfDetention(String caseReference, String district) {
        try {
            List<Map<String, Object>> lawyers = jdbcTemplate.queryForList(
                    "SELECT username FROM users WHERE role = 'Lawyer' AND approval_status = 'Approved' " +
                            "AND LOWER(TRIM(district)) = LOWER(TRIM(?)) LIMIT 20", district);
            String message = "URGENT: a detention report (" + caseReference + ") needs a lawyer. "
                    + "Someone may have been held for more than 48 hours.";
            for (Map<String, Object> lawyer : lawyers) {
                jdbcTemplate.update(
                        "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) " +
                                "VALUES (?, ?, 'urgent_detention', ?, false, NOW())",
                        lawyer.get("username"), message, caseReference);
            }
        } catch (Exception e) {
            logger.error("Could not alert lawyers about detention report {}: {}", caseReference, e.getMessage());
        }
    }

    public static class LawyerOffer {
        public final String username;
        public LawyerOffer(String username) { this.username = username; }
    }

    public LawyerOffer offerCaseToNextLawyer(String caseReference, String district, String subCounty,
                                              String parish, String caseType, String justDeclinedBy) {
        try {
            String declinedCsv = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(declined_lawyers, '') FROM cases WHERE case_reference = ?",
                    String.class, caseReference);
            java.util.Set<String> excluded = new java.util.HashSet<>();
            if (declinedCsv != null && !declinedCsv.isBlank()) {
                for (String u : declinedCsv.split(",")) {
                    if (!u.isBlank()) excluded.add(u.trim());
                }
            }
            if (justDeclinedBy != null && !justDeclinedBy.isBlank()) {
                excluded.add(justDeclinedBy.trim());
                String updatedCsv = (declinedCsv == null || declinedCsv.isBlank())
                        ? justDeclinedBy : declinedCsv + "," + justDeclinedBy;
                jdbcTemplate.update(
                        "UPDATE cases SET declined_lawyers = ? WHERE case_reference = ?",
                        updatedCsv, caseReference);
            }

            List<Map<String, Object>> candidates = jdbcTemplate.queryForList(
                    "SELECT u.username, " +
                            "(SELECT COUNT(*) FROM cases c2 WHERE c2.assigned_lawyer = u.username AND c2.status NOT IN ('Resolved','Closed')) AS active_count " +
                            "FROM users u WHERE u.role = 'Lawyer' AND u.approval_status = 'Approved' " +
                            "AND LOWER(TRIM(u.district)) = LOWER(TRIM(?)) " +
                            "AND (LOWER(TRIM(u.lawyer_specialization)) = LOWER(TRIM(?)) OR u.lawyer_specialization IS NULL) " +
                            "ORDER BY active_count ASC",
                    district, caseType);

            if (allExcluded(candidates, excluded)) {
                candidates = jdbcTemplate.queryForList(
                        "SELECT u.username, " +
                                "(SELECT COUNT(*) FROM cases c2 WHERE c2.assigned_lawyer = u.username AND c2.status NOT IN ('Resolved','Closed')) AS active_count " +
                                "FROM users u WHERE u.role = 'Lawyer' AND u.approval_status = 'Approved' AND LOWER(TRIM(u.district)) = LOWER(TRIM(?)) " +
                                "ORDER BY active_count ASC",
                        district);
            }

            if (allExcluded(candidates, excluded)) {
                candidates = jdbcTemplate.queryForList(
                        "SELECT u.username, " +
                                "(SELECT COUNT(*) FROM cases c2 WHERE c2.assigned_lawyer = u.username AND c2.status NOT IN ('Resolved','Closed')) AS active_count " +
                                "FROM users u WHERE u.role = 'Lawyer' AND u.approval_status = 'Approved' " +
                                "ORDER BY active_count ASC");
            }

            String nextLawyer = null;
            for (Map<String, Object> c : candidates) {
                String username = (String) c.get("username");
                if (!excluded.contains(username)) { nextLawyer = username; break; }
            }

            if (nextLawyer == null) {
                jdbcTemplate.update(
                        "UPDATE cases SET routing_status = 'no_lawyer_available', selected_lawyer = NULL, selected_lawyer_status = NULL WHERE case_reference = ?",
                        caseReference);
                return null;
            }

            jdbcTemplate.update(
                    "UPDATE cases SET selected_lawyer = ?, selected_lawyer_status = 'Pending', routing_status = 'offered_to_lawyer' WHERE case_reference = ?",
                    nextLawyer, caseReference);
            notifyLawyerOfAiOffer(nextLawyer, caseReference);
            return new LawyerOffer(nextLawyer);

        } catch (Exception e) {
            logger.error("❌ Error offering case to next lawyer: " + e.getMessage());
            return null;
        }
    }

    private boolean allExcluded(List<Map<String, Object>> candidates, java.util.Set<String> excluded) {
        for (Map<String, Object> c : candidates) {
            if (!excluded.contains((String) c.get("username"))) return false;
        }
        return true;
    }

    public void notifyLawyerOfAiOffer(String username, String caseReference) {
        try {
            String sql = "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) " +
                    "VALUES (?, ?, 'ai_case_offer', ?, false, NOW())";
            String message = "The system has matched case " + caseReference + " to you. Please accept or decline.";
            jdbcTemplate.update(sql, username, message, caseReference);
        } catch (Exception e) {
            logger.error("❌ Error notifying lawyer of AI offer: " + e.getMessage());
        }
    }
}
