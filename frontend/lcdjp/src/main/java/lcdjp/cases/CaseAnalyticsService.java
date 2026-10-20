package lcdjp.cases;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Builds the case analytics dashboard data. The controller decides who may see it and for which district. */
@Service
public class CaseAnalyticsService {

    private final JdbcTemplate jdbcTemplate;

    public CaseAnalyticsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * @param district the district to restrict to (a District Admin's own district), or null for all districts
     */
    public Map<String, Object> analytics(String district) {
        boolean isDistrictAdmin = district != null;
        String scopeWhere = isDistrictAdmin ? "district = ?" : null;
            Object[] scopeArgs = isDistrictAdmin ? new Object[]{district} : new Object[]{};

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);

            long totalCases = queryLong(
                    "SELECT COUNT(*) FROM cases" + whereClause(scopeWhere), scopeArgs);
            result.put("totalCases", totalCases);

            Map<String, Long> byStatus = new LinkedHashMap<>();
            for (Map<String, Object> row : jdbcTemplate.queryForList(
                    "SELECT status, COUNT(*) AS cnt FROM cases" + whereClause(scopeWhere) +
                            " GROUP BY status", scopeArgs)) {
                byStatus.put(orUnknown(row.get("status")), toLong(row.get("cnt")));
            }
            result.put("byStatus", byStatus);

            result.put("byType", labelCountList(jdbcTemplate.queryForList(
                    "SELECT case_type AS label, COUNT(*) AS cnt FROM cases" + whereClause(scopeWhere) +
                            " GROUP BY case_type ORDER BY cnt DESC LIMIT 10", scopeArgs)));

            result.put("typeOptions", jdbcTemplate.queryForList(
                    "SELECT DISTINCT case_type FROM cases" +
                            whereClause(scopeWhere, "case_type IS NOT NULL AND case_type <> ''") +
                            " ORDER BY case_type", scopeArgs)
                    .stream().map(r -> strVal(r.get("case_type"))).collect(Collectors.toList()));
            if (!isDistrictAdmin) {
                result.put("districtOptions", labelCountList(jdbcTemplate.queryForList(
                        "SELECT district AS label, COUNT(*) AS cnt FROM cases" + whereClause(scopeWhere) +
                                " GROUP BY district ORDER BY label", scopeArgs)));
            }

            Map<String, Long> byLevel = new LinkedHashMap<>();
            for (Map<String, Object> row : jdbcTemplate.queryForList(
                    "SELECT current_level AS label, COUNT(*) AS cnt FROM cases" + whereClause(scopeWhere) +
                            " GROUP BY current_level", scopeArgs)) {
                byLevel.put(orUnknown(row.get("label")), toLong(row.get("cnt")));
            }
            result.put("byLevel", byLevel);

            String locExpr = "COALESCE(NULLIF(TRIM(village), ''), district, 'Unknown')";
            result.put("topLocations", labelCountList(jdbcTemplate.queryForList(
                    "SELECT " + locExpr + " AS label, COUNT(*) AS cnt FROM cases" +
                            whereClause(scopeWhere) + " GROUP BY label ORDER BY cnt DESC LIMIT 10",
                    scopeArgs)));

            LocalDate sixMonthsAgo = LocalDate.now().withDayOfMonth(1).minusMonths(5);
            List<Object> trendArgs = new ArrayList<>(List.of((Object[]) scopeArgs));
            trendArgs.add(sixMonthsAgo);
            List<Map<String, Object>> trendRows = jdbcTemplate.queryForList(
                    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS total, " +
                            "SUM(CASE WHEN status IN ('Resolved','Closed') THEN 1 ELSE 0 END) AS resolved " +
                            "FROM cases" + whereClause(scopeWhere, "created_at >= ?") +
                            " GROUP BY ym ORDER BY ym ASC",
                    trendArgs.toArray());
            Map<String, long[]> trendByMonth = new HashMap<>();
            for (Map<String, Object> row : trendRows) {
                trendByMonth.put(strVal(row.get("ym")),
                        new long[]{toLong(row.get("total")), toLong(row.get("resolved"))});
            }
            List<Map<String, Object>> monthlyTrend = new ArrayList<>();
            DateTimeFormatter ymFmt = DateTimeFormatter.ofPattern("yyyy-MM");
            DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("MMM");
            for (int i = 0; i < 6; i++) {
                LocalDate month = sixMonthsAgo.plusMonths(i);
                long[] counts = trendByMonth.getOrDefault(month.format(ymFmt), new long[]{0, 0});
                monthlyTrend.add(Map.of(
                        "label", month.format(labelFmt),
                        "total", counts[0],
                        "resolved", counts[1]
                ));
            }
            result.put("monthlyTrend", monthlyTrend);

            List<Map<String, Object>> lawyerRows = jdbcTemplate.queryForList(
                    "SELECT c.assigned_lawyer AS username, " +
                            "CONCAT(u.first_name, ' ', u.last_name) AS name, " +
                            "COUNT(*) AS total, " +
                            "SUM(CASE WHEN c.status IN ('Resolved','Closed') THEN 1 ELSE 0 END) AS resolved " +
                            "FROM cases c " +
                            "JOIN users u ON c.assigned_lawyer = u.username " +
                            (scopeWhere == null ? "WHERE" : "WHERE c." + scopeWhere + " AND") +
                            " c.assigned_lawyer IS NOT NULL AND c.assigned_lawyer <> '' " +
                            "GROUP BY c.assigned_lawyer, name " +
                            "ORDER BY total DESC LIMIT 5",
                    scopeArgs);
            List<Map<String, Object>> lawyerPerformance = new ArrayList<>();
            for (Map<String, Object> row : lawyerRows) {
                long total = toLong(row.get("total"));
                long resolved = toLong(row.get("resolved"));
                lawyerPerformance.add(Map.of(
                        "name", orUnknown(row.get("name")),
                        "total", total,
                        "resolved", resolved,
                        "pending", total - resolved
                ));
            }
            result.put("lawyerPerformance", lawyerPerformance);

            result.put("withLawyersCount", queryLong(
                    "SELECT COUNT(*) FROM cases" + whereClause(scopeWhere,
                            "status IN ('Accepted by Lawyer','Forwarded to Lawyer')"), scopeArgs));
            result.put("forwardedToHigherCount", queryLong(
                    "SELECT COUNT(*) FROM cases" + whereClause(scopeWhere,
                            "status LIKE 'Forwarded to LC%'"), scopeArgs));
            result.put("distinctCaseTypes", queryLong(
                    "SELECT COUNT(DISTINCT case_type) FROM cases" + whereClause(scopeWhere), scopeArgs));
            result.put("distinctLocations", queryLong(
                    "SELECT COUNT(DISTINCT " + locExpr + ") FROM cases" + whereClause(scopeWhere), scopeArgs));

        return result;
    }

    private String whereClause(String... fragments) {
        List<String> parts = new ArrayList<>();
        for (String f : fragments) {
            if (f != null && !f.isBlank()) parts.add(f);
        }
        return parts.isEmpty() ? "" : " WHERE " + String.join(" AND ", parts);
    }

    private long queryLong(String sql, Object... args) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, args);
        return value == null ? 0L : value;
    }

    private long toLong(Object n) {
        return n instanceof Number ? ((Number) n).longValue() : 0L;
    }

    private String orUnknown(Object v) {
        String s = strVal(v);
        return s.isEmpty() ? "Unknown" : s;
    }

    private List<Map<String, Object>> labelCountList(List<Map<String, Object>> rows) {
        return rows.stream()
                .map(r -> Map.<String, Object>of("label", orUnknown(r.get("label")), "count", toLong(r.get("cnt"))))
                .collect(Collectors.toList());
    }

    private String strVal(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
