package lcdjp.cases;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * All SQL for the case endpoints in {@link CaseController}. The controller decides who may do
 * what and shapes the response; this class only talks to the database.
 */
@Repository
public class CaseQueryRepository {

    private static final String CASE_WITH_CITIZEN =
            "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
            "FROM cases c LEFT JOIN users u ON c.citizen_id = u.username";

    private final JdbcTemplate jdbcTemplate;

    public CaseQueryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Throws if the database cannot be reached. */
    public void ping() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
    }

    // ---- admin list -------------------------------------------------------------------

    private static String listWhere(List<String> conditions) {
        return conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);
    }

    private static final String LIST_FROM = "FROM cases c LEFT JOIN users u ON c.citizen_id = u.username";

    private static String listSql(List<String> conditions) {
        return "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
                LIST_FROM + listWhere(conditions) + " ORDER BY c.created_at DESC";
    }

    public long countCases(List<String> conditions, List<Object> args) {
        String countSql = "SELECT COUNT(*) " + LIST_FROM + listWhere(conditions);
        Long total = args.isEmpty()
                ? jdbcTemplate.queryForObject(countSql, Long.class)
                : jdbcTemplate.queryForObject(countSql, Long.class, args.toArray());
        return total == null ? 0L : total;
    }

    public List<Map<String, Object>> listCasesPage(List<String> conditions, List<Object> args,
                                                   int pageSize, int offset) {
        String sql = listSql(conditions) + " LIMIT ? OFFSET ?";
        if (args.isEmpty()) {
            return jdbcTemplate.queryForList(sql, pageSize, offset);
        }
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(pageSize);
        pageArgs.add(offset);
        return jdbcTemplate.queryForList(sql, pageArgs.toArray());
    }

    public List<Map<String, Object>> listCasesCapped(List<String> conditions, List<Object> args, int cap) {
        String sql = listSql(conditions) + " LIMIT ?";
        if (args.isEmpty()) {
            return jdbcTemplate.queryForList(sql, cap);
        }
        List<Object> capArgs = new ArrayList<>(args);
        capArgs.add(cap);
        return jdbcTemplate.queryForList(sql, capArgs.toArray());
    }

    // ---- single case ------------------------------------------------------------------

    public List<Map<String, Object>> findCaseWithCitizen(String caseReference) {
        return jdbcTemplate.queryForList(CASE_WITH_CITIZEN + " WHERE c.case_reference = ?", caseReference);
    }

    public List<Map<String, Object>> findOpenCases() {
        return jdbcTemplate.queryForList(CASE_WITH_CITIZEN +
                " WHERE c.status NOT IN ('Resolved', 'Closed') ORDER BY c.created_at DESC");
    }

    public Long countOpenCases() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM cases WHERE status NOT IN ('Resolved', 'Closed')", Long.class);
    }

    public List<Map<String, Object>> findCasesByHandler(String handler) {
        return jdbcTemplate.queryForList(CASE_WITH_CITIZEN +
                " WHERE c.current_handler = ? ORDER BY c.created_at DESC", handler);
    }

    public boolean caseExists(String caseReference) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM cases WHERE case_reference = ?", Integer.class, caseReference);
        return count != null && count > 0;
    }

    public int countCasesCreatedToday() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM cases WHERE DATE(created_at) = CURDATE()", Integer.class);
        return count == null ? 0 : count;
    }

    public Map<String, Object> findCaseByClientDraftId(String citizenId, String clientDraftId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT case_reference, routing_choice FROM cases WHERE citizen_id = ? AND client_draft_id = ?",
                citizenId, clientDraftId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    // ---- lawyer / LC work lists -------------------------------------------------------

    /** District, sub-county, parish and specialization of a lawyer (column order as the list query reads it). */
    public List<Map<String, Object>> findLawyerArea(String lawyerId) {
        return jdbcTemplate.queryForList(
                "SELECT district, sub_county, parish, lawyer_specialization FROM users WHERE username = ?",
                lawyerId);
    }

    public List<Map<String, Object>> findLawyerAreaForAvailable(String lawyerId) {
        return jdbcTemplate.queryForList(
                "SELECT district, parish, sub_county, lawyer_specialization FROM users WHERE username = ?",
                lawyerId);
    }

    public List<Map<String, Object>> findCasesForLawyer(String lawyerId, String district,
                                                        String subCounty, String parish) {
        String sql = """
                    SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name
                    FROM cases c
                    LEFT JOIN users u ON c.citizen_id = u.username
                    WHERE
                        c.assigned_lawyer = ?
                        OR c.selected_lawyer = ?
                        OR (
                            c.routing_status IN ('available_to_all_lawyers', 'pending_routing', 'pending_admin')
                            AND c.status NOT IN ('Resolved', 'Closed')
                            AND (
                                c.district = ?
                                OR c.parish = ?
                                OR c.sub_county = ?
                            )
                        )
                    ORDER BY
                        CASE
                            WHEN c.selected_lawyer = ? AND c.selected_lawyer_status = 'Pending' THEN 0
                            WHEN c.assigned_lawyer = ? THEN 1
                            ELSE 2
                        END,
                        c.created_at DESC
                """;
        return jdbcTemplate.queryForList(sql,
                lawyerId, lawyerId,
                district, parish, subCounty,
                lawyerId, lawyerId);
    }

    public List<Map<String, Object>> findAvailableCasesForLawyer(String lawyerId, String district,
                                                                 String parish, String subCounty) {
        String sql = """
                    SELECT c.case_reference, c.case_number, c.case_type, c.citizen_id,
                           c.status, c.district, c.parish, c.sub_county, c.village,
                           c.assigned_lawyer, c.selected_lawyer, c.selected_lawyer_status,
                           c.current_level, c.created_at,
                           CONCAT(u.first_name, ' ', u.last_name) AS citizen_name
                    FROM cases c
                    LEFT JOIN users u ON c.citizen_id = u.username
                    WHERE
                        c.assigned_lawyer = ?
                        OR c.selected_lawyer = ?
                        OR (
                            c.assigned_lawyer IS NULL
                            AND c.assigned_lc IS NULL
                            AND c.assigned_org IS NULL
                            AND c.routing_status IN ('available_to_all_lawyers', 'pending_routing', 'pending_admin')
                            AND c.status NOT IN ('Resolved', 'Closed')
                            AND (c.district = ? OR c.parish = ? OR c.sub_county = ?)
                        )
                    ORDER BY
                        CASE
                            WHEN c.selected_lawyer = ? AND c.selected_lawyer_status = 'Pending' THEN 1
                            WHEN c.assigned_lawyer = ? THEN 2
                            ELSE 3
                        END,
                        c.created_at DESC
                """;
        return jdbcTemplate.queryForList(sql,
                lawyerId, lawyerId,
                district, parish, subCounty,
                lawyerId, lawyerId);
    }

    public List<Map<String, Object>> findLcProfile(String lcUsername) {
        return jdbcTemplate.queryForList("SELECT district, role FROM users WHERE username = ?", lcUsername);
    }

    public List<Map<String, Object>> findCasesForLc(String lcUsername, String district) {
        String sql = """
                    SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name
                    FROM cases c
                    LEFT JOIN users u ON c.citizen_id = u.username
                    WHERE
                        c.assigned_lc = ?
                        OR c.current_handler = ?
                        OR (
                            (c.assigned_lc IS NULL OR c.assigned_lc = '')
                            AND (c.current_handler IS NULL OR c.current_handler = '')
                            AND c.status NOT IN ('Resolved', 'Closed')
                            AND c.district = ?
                            AND (c.jurisdiction_track IS NULL
                                 OR c.jurisdiction_track IN ('LC_MEDIATION', 'LAND'))
                        )
                    ORDER BY
                        CASE
                            WHEN c.assigned_lc = ? OR c.current_handler = ? THEN 0
                            ELSE 1
                        END,
                        c.created_at DESC
                """;
        return jdbcTemplate.queryForList(sql,
                lcUsername, lcUsername,
                district,
                lcUsername, lcUsername);
    }

    // ---- create -----------------------------------------------------------------------

    private static final String INSERT_CASE = "INSERT INTO cases (" +
            "case_reference, case_type, citizen_id, description, " +
            "district, sub_county, parish, village, " +
            "status, current_level, created_at, routing_status, " +
            "citizen_phone, citizen_email, " +
            "kin_name, kin_phone, kin_email, kin_relationship, " +
            "full_location, " +
            "attached_media, attached_file_data, attached_file_size, attached_file_type, " +
            "has_voice_statement, voice_statement, voice_duration, " +
            "has_video_statement, video_statement, video_duration, " +
            "extra_notes, client_draft_id" +
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pending_routing', " +
            "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    /** Inserts a new case; the values must be in the column order of {@link #INSERT_CASE}. */
    public void insertCase(Object... values) {
        jdbcTemplate.update(INSERT_CASE, values);
    }

    // ---- state changes ----------------------------------------------------------------

    /** @return rows updated; 0 means no such case. */
    public int acceptByLc(String caseReference, String lcId) {
        return jdbcTemplate.update(
                "UPDATE cases SET assigned_lc = ?, current_handler = ?, handler_role = ?, " +
                        "routing_status = 'accepted_by_lc', status = 'Accepted by LC' WHERE case_reference = ?",
                lcId, lcId, "LC Official", caseReference);
    }

    public int acceptByLawyer(String caseReference, String lawyerId) {
        return jdbcTemplate.update(
                "UPDATE cases SET assigned_lawyer = ?, routing_status = 'accepted_by_lawyer', " +
                        "status = 'Accepted by Lawyer' WHERE case_reference = ?",
                lawyerId, caseReference);
    }

    public int resolve(String caseReference, String resolvedByRole) {
        return jdbcTemplate.update(
                "UPDATE cases SET status = 'Resolved', resolved_by_role = ?, resolved_at = NOW() WHERE case_reference = ?",
                resolvedByRole, caseReference);
    }

    public int saveLegalAdvice(String caseReference, String adviceText, String providedBy) {
        return jdbcTemplate.update(
                "UPDATE cases SET legal_advice = ?, legal_advice_provided_by = ?, legal_advice_date = NOW() WHERE case_reference = ?",
                adviceText, providedBy, caseReference);
    }

    public int delete(String caseReference) {
        return jdbcTemplate.update("DELETE FROM cases WHERE case_reference = ?", caseReference);
    }

    /** Runs a partial update assembled by the controller from a fixed set of column names. */
    public int updateColumns(String updateSql, List<Object> params) {
        return jdbcTemplate.update(updateSql, params.toArray());
    }

    public int assignHandler(String caseReference, String handler, String handlerRole,
                             boolean messagingEnabled, boolean messagingLocked) {
        return jdbcTemplate.update(
                "UPDATE cases SET current_handler = ?, handler_role = ?, " +
                        "messaging_enabled = ?, messaging_locked = ?, " +
                        "routing_status = 'assigned_by_admin', " +
                        "status = 'Assigned' " +
                        "WHERE case_reference = ?",
                handler, handlerRole,
                messagingEnabled ? 1 : 0,
                messagingLocked ? 1 : 0,
                caseReference);
    }

    // ---- new-case follow-up writes ----------------------------------------------------

    public void setLcLocation(String caseReference, String choice, String source) {
        jdbcTemplate.update(
                "UPDATE cases SET lc_location_choice = ?, lc_location_source = ? WHERE case_reference = ?",
                choice, source, caseReference);
    }

    public void setJurisdiction(String caseReference, String track, boolean urgent) {
        jdbcTemplate.update(
                "UPDATE cases SET jurisdiction_track = ?, jurisdiction_urgent = ? WHERE case_reference = ?",
                track, urgent, caseReference);
    }

    public void setEncryptedDetails(String caseReference, String encryptedDetails) {
        jdbcTemplate.update("UPDATE cases SET case_details = ? WHERE case_reference = ?",
                encryptedDetails, caseReference);
    }

    public void routeToLegalAid(String caseReference) {
        jdbcTemplate.update("UPDATE cases SET routing_choice = 'legal_aid' WHERE case_reference = ?", caseReference);
    }

    public void markInfoOnly(String caseReference, String routingChoice) {
        jdbcTemplate.update(
                "UPDATE cases SET routing_status = 'info_only', routing_choice = ? WHERE case_reference = ?",
                routingChoice, caseReference);
    }

    public void markAwaitingRoutingChoice(String caseReference) {
        jdbcTemplate.update(
                "UPDATE cases SET routing_status = 'awaiting_routing_choice' WHERE case_reference = ?",
                caseReference);
    }
}
