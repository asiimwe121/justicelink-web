package lcdjp.notification;

import lcdjp.admin.AuditLogService;
import lcdjp.cases.CaseRows;
import lcdjp.cases.JurisdictionRouting;
import lcdjp.user.PhoneUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class JdbcUssdBackend implements UssdBackend {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuditLogService auditLogService;

    @Override
    public Optional<String> citizenForPhone(String phoneNumber) {
        String last9 = PhoneUtil.normalizeLast9(phoneNumber);
        if (last9 == null) return Optional.empty();
        List<String> matches = jdbcTemplate.queryForList(
                "SELECT username FROM users WHERE role = 'Citizen' AND phone IS NOT NULL " +
                        "AND RIGHT(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), 9) = ?",
                String.class, last9);
        // A number shared by several accounts cannot be tied to one person, so it is treated as unknown.
        return matches.size() == 1 ? Optional.of(matches.get(0)) : Optional.empty();
    }

    @Override
    public String createReport(String citizenUsername, String phoneNumber, String caseType, String district,
                               String shortDescription) {
        JurisdictionRouting.Assessment jurisdiction = JurisdictionRouting.assess(caseType, shortDescription);
        String reference = String.format("LCDJP-%s-U%d", LocalDate.now().toString().replace("-", ""),
                (int) (Math.random() * 900000) + 100000);

        jdbcTemplate.update(
                "INSERT INTO cases (case_reference, case_type, citizen_id, description, district, status, " +
                        "current_level, created_at, routing_status, citizen_phone, jurisdiction_track, " +
                        "jurisdiction_urgent) VALUES (?, ?, ?, ?, ?, 'Pending', 'Citizen Desk', NOW(), " +
                        "'pending_routing', ?, ?, ?)",
                reference, caseType, citizenUsername,
                CaseRows.seal(jurisdiction.track.name(), shortDescription), district, phoneNumber,
                jurisdiction.track.name(), jurisdiction.isUrgent());

        auditLogService.logAction(citizenUsername, "Citizen", "CASE_CREATED", "case", reference,
                "Report received by USSD: " + caseType + ", " + district);
        if (jurisdiction.isUrgent()) {
            auditLogService.logAction(citizenUsername, "Citizen", "CASE_URGENT_FLAGGED", "case", reference,
                    "Jurisdiction track: " + jurisdiction.track.name() + " (USSD)");
        }
        return reference;
    }

    @Override
    public List<String> recentCaseStatusLines(String citizenUsername, int limit) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT case_reference, status FROM cases WHERE citizen_id = ? ORDER BY created_at DESC LIMIT ?",
                citizenUsername, limit);
        List<String> lines = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            lines.add(row.get("case_reference") + ": " + row.get("status"));
        }
        return lines;
    }
}
