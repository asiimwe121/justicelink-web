package lcdjp.cases;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** SQL for AI-matched lawyer offers and the legal-aid routing choice on a case. */
@Repository
public class CaseOfferRepository {

    private final JdbcTemplate jdbcTemplate;

    public CaseOfferRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void setRoutingChoice(String caseReference, String choice) {
        jdbcTemplate.update("UPDATE cases SET routing_choice = ? WHERE case_reference = ?", choice, caseReference);
    }

    public void markInfoOnly(String caseReference) {
        jdbcTemplate.update("UPDATE cases SET routing_status = 'info_only' WHERE case_reference = ?", caseReference);
    }

    /** @return rows updated; 0 means no such case. */
    public int acceptOffer(String caseReference, String lawyerId) {
        return jdbcTemplate.update(
                "UPDATE cases SET assigned_lawyer = ?, selected_lawyer_status = 'Accepted', " +
                        "routing_status = 'accepted_by_lawyer', status = 'Accepted by Lawyer' WHERE case_reference = ?",
                lawyerId, caseReference);
    }

    public void declineOffer(String caseReference, String declinedLawyersCsv) {
        jdbcTemplate.update(
                "UPDATE cases SET declined_lawyers = ?, selected_lawyer = NULL, " +
                        "selected_lawyer_status = NULL, routing_status = 'declined_awaiting_reselection' " +
                        "WHERE case_reference = ?",
                declinedLawyersCsv, caseReference);
    }

    public boolean approvedLawyerExists(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ? AND role = 'Lawyer' AND approval_status = 'Approved'",
                Integer.class, username);
        return count != null && count > 0;
    }

    /** The LC official's district when they are an approved LC Official, otherwise empty. */
    public java.util.Optional<String> findApprovedLcDistrict(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT district FROM users WHERE username = ? AND role = 'LC Official' AND approval_status = 'Approved'",
                username);
        if (rows.isEmpty()) return java.util.Optional.empty();
        Object d = rows.get(0).get("district");
        return java.util.Optional.of(d == null ? "" : d.toString());
    }

    /** The approved LC official's level and area columns, or empty when they are not an approved LC Official. */
    public java.util.Optional<Map<String, Object>> findApprovedLcProfile(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username, district, sub_county, parish, village, lc_level FROM users " +
                        "WHERE username = ? AND role = 'LC Official' AND approval_status = 'Approved'",
                username);
        return rows.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of(rows.get(0));
    }

    /**
     * The citizen chose this LC: the case shows up in that LC's list (current_handler) but is not "accepted"
     * until the LC accepts it, so the escalation clock keeps running if they ignore it.
     */
    public int offerToLc(String caseReference, String lcUsername) {
        return jdbcTemplate.update(
                "UPDATE cases SET current_handler = ?, handler_role = 'LC Official', " +
                        "routing_status = 'offered_to_lc', routing_choice = 'lc' WHERE case_reference = ?",
                lcUsername, caseReference);
    }

    public void offerToLawyer(String caseReference, String lawyerUsername) {
        jdbcTemplate.update(
                "UPDATE cases SET selected_lawyer = ?, selected_lawyer_status = 'Pending', " +
                        "routing_status = 'offered_to_lawyer', routing_choice = 'legal_aid' WHERE case_reference = ?",
                lawyerUsername, caseReference);
    }

    /** The citizen's newest unassigned legal-aid case that is still waiting on a lawyer, if any. */
    public List<Map<String, Object>> findResumableLegalAidCase(String citizenId, LocalDateTime createdAfter,
                                                               String caseType) {
        boolean byType = caseType != null && !caseType.isEmpty();
        String sql = "SELECT case_reference, case_type, description, district, sub_county, parish, " +
                "routing_status, selected_lawyer, selected_lawyer_status, declined_lawyers, " +
                "assigned_lawyer, created_at " +
                "FROM cases WHERE citizen_id = ? AND routing_choice = 'legal_aid' " +
                "AND (assigned_lawyer IS NULL OR assigned_lawyer = '') " +
                "AND routing_status IN ('offered_to_lawyer', 'declined_awaiting_reselection', 'no_lawyer_available') " +
                "AND created_at >= ? " +
                (byType ? "AND case_type = ? " : "") +
                "ORDER BY created_at DESC LIMIT 1";
        return byType
                ? jdbcTemplate.queryForList(sql, citizenId, createdAfter, caseType)
                : jdbcTemplate.queryForList(sql, citizenId, createdAfter);
    }

    public List<Map<String, Object>> findPendingOffersForLawyer(String username) {
        return jdbcTemplate.queryForList(
                "SELECT c.case_reference AS caseId, c.case_type AS caseType, c.district, c.village, " +
                        "CONCAT(u.first_name, ' ', u.last_name) AS citizenName " +
                        "FROM cases c LEFT JOIN users u ON c.citizen_id = u.username " +
                        "WHERE c.selected_lawyer = ? AND c.selected_lawyer_status = 'Pending' " +
                        "ORDER BY c.created_at DESC",
                username);
    }
}
