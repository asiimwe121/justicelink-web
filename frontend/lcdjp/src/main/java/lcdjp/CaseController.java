package lcdjp;

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

@RestController
@RequestMapping("/api/cases")
public class CaseController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseController.class);
    private static final int LEGAL_AID_RESUME_EXPIRY_DAYS = 14;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CaseAccessService caseAccessService;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private CaseService caseService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CaseClassificationService caseClassificationService;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String datasourceUsername;

    @Value("${spring.datasource.password}")
    private String datasourcePassword;

    private static final int MAX_PAGE_SIZE = 500;
    private static final int DEFAULT_PAGE_SIZE = 25;

    private static final int UNPAGINATED_HARD_CAP = 5000;

    @GetMapping
    public ResponseEntity<?> getAllCases(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String district) {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators may view all cases"));
            }

            Map<String, Object> actorRow = userRow(actor);
            String role = strVal(actorRow.get("role")).toUpperCase().replace(' ', '_');
            boolean isDistrictAdmin = role.equals("DISTRICT_ADMIN");

            boolean paginated = page != null || pageSize != null;

            List<String> conditions = new ArrayList<>();
            List<Object> args = new ArrayList<>();

            if (isDistrictAdmin) {
                String adminDistrict = strVal(actorRow.get("district"));
                if (adminDistrict.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }
                conditions.add("c.district = ?");
                args.add(adminDistrict);
            } else if (district != null && !district.isBlank()) {
                conditions.add("c.district = ?");
                args.add(district.trim());
            }
            if (status != null && !status.isBlank()) {
                conditions.add("c.status = ?");
                args.add(status.trim());
            }
            if (type != null && !type.isBlank()) {
                conditions.add("c.case_type = ?");
                args.add(type.trim());
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim() + "%";
                conditions.add("(c.case_reference LIKE ? OR c.case_number LIKE ? OR " +
                        "c.case_type LIKE ? OR c.district LIKE ? OR " +
                        "CONCAT(u.first_name, ' ', u.last_name) LIKE ?)");
                for (int i = 0; i < 5; i++) args.add(like);
            }

            String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);
            String fromJoin = "FROM cases c LEFT JOIN users u ON c.citizen_id = u.username";
            String baseSql = "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
                    fromJoin + where + " ORDER BY c.created_at DESC";
            String countSql = "SELECT COUNT(*) " + fromJoin + where;

            List<Map<String, Object>> cases;
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);

            if (paginated) {
                int resolvedPage = (page == null || page < 1) ? 1 : page;
                int resolvedPageSize = resolvedPageSize(pageSize);
                int offset = (resolvedPage - 1) * resolvedPageSize;
                Long queriedTotal = args.isEmpty()
                        ? jdbcTemplate.queryForObject(countSql, Long.class)
                        : jdbcTemplate.queryForObject(countSql, Long.class, args.toArray());
                long totalCount = queriedTotal == null ? 0L : queriedTotal;

                List<Object> pageArgs = new ArrayList<>(args);
                pageArgs.add(resolvedPageSize);
                pageArgs.add(offset);
                cases = args.isEmpty()
                        ? jdbcTemplate.queryForList(baseSql + " LIMIT ? OFFSET ?", resolvedPageSize, offset)
                        : jdbcTemplate.queryForList(baseSql + " LIMIT ? OFFSET ?", pageArgs.toArray());

                body.put("page", resolvedPage);
                body.put("pageSize", resolvedPageSize);
                body.put("totalCount", totalCount);
            } else {
                if (args.isEmpty()) {
                    cases = jdbcTemplate.queryForList(baseSql + " LIMIT ?", UNPAGINATED_HARD_CAP);
                } else {
                    List<Object> capArgs = new ArrayList<>(args);
                    capArgs.add(UNPAGINATED_HARD_CAP);
                    cases = jdbcTemplate.queryForList(baseSql + " LIMIT ?", capArgs.toArray());
                }
                warnIfTruncated(cases.size(), conditions.isEmpty() ? "unfiltered" : "filtered:" + conditions);
            }
            body.put("cases", cases);
            return ResponseEntity.ok(body);
    }

    public ResponseEntity<?> getAllCases(Integer page, Integer pageSize) {
        return getAllCases(page, pageSize, null, null, null, null);
    }

    private void warnIfTruncated(int returnedCount, String scope) {
        if (returnedCount >= UNPAGINATED_HARD_CAP) {
            logger.warn("GET /api/cases ({}) hit the {}-row unpaginated cap — " +
                            "results were truncated. Callers relying on the full case " +
                            "set (analytics/reports/admin dashboards) need to switch to " +
                            "page/pageSize or a dedicated aggregate endpoint.",
                    scope, UNPAGINATED_HARD_CAP);
        }
    }

    private int resolvedPageSize(Integer requested) {
        if (requested == null || requested < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requested, MAX_PAGE_SIZE);
    }

    @GetMapping("/{caseId}")
    public ResponseEntity<?> getCase(@PathVariable String caseId) {
            String sql = "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
                    "FROM cases c " +
                    "LEFT JOIN users u ON c.citizen_id = u.username " +
                    "WHERE c.case_reference = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, caseId);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }

            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!canAccessCase(actor, results.get(0))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You do not have access to this case"));
            }

            Map<String, Object> caseData = normalizeCase(results.get(0));
            return ResponseEntity.ok(Map.of("success", true, "case", caseData));
    }

    private Map<String, Object> normalizeCase(Map<String, Object> raw) {
        Map<String, Object> c = new HashMap<>(raw);

        c.put("caseId", raw.get("case_reference"));
        c.put("caseType", raw.get("case_type"));
        c.put("citizen", raw.get("citizen_name"));
        c.put("citizenPhone", raw.get("citizen_phone"));
        c.put("citizenEmail", raw.get("citizen_email"));
        c.put("fullLocation", raw.get("full_location"));
        c.put("level", raw.get("current_level"));
        c.put("submissionDate", raw.get("created_at"));
        c.put("resolvedDate", raw.get("resolved_at"));
        c.put("kinName", raw.get("kin_name"));
        c.put("kinPhone", raw.get("kin_phone"));
        c.put("kinEmail", raw.get("kin_email"));
        c.put("kinRelationship", raw.get("kin_relationship"));

        String handler = strVal(raw.get("current_handler"));
        String handlerRole = strVal(raw.get("handler_role"));

        if (handler.isEmpty() && !strVal(raw.get("assigned_lc")).isEmpty()) {
            handler = strVal(raw.get("assigned_lc"));
            handlerRole = "LC Official";
        } else if (handler.isEmpty() && !strVal(raw.get("assigned_lawyer")).isEmpty()) {
            handler = strVal(raw.get("assigned_lawyer"));
            handlerRole = "Lawyer";
            c.put("assignedLawyerName", raw.get("assigned_lawyer"));
        } else if (handler.isEmpty() && !strVal(raw.get("assigned_org")).isEmpty()) {
            handler = strVal(raw.get("assigned_org"));
            handlerRole = "Legal Organization";
        }

        c.put("currentHandler", handler.isEmpty() ? null : handler);
        c.put("handlerRole", handlerRole.isEmpty() ? null : handlerRole);
        c.put("previousHandlers", previousHandlers(strVal(raw.get("case_reference"))));

        return c;
    }

    private String strVal(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private String authenticatedUsername() {
        return caseAccessService.authenticatedUsername();
    }

    private String authenticatedRole() {
        return caseAccessService.authenticatedRole();
    }

    private boolean isAdministrator(String username) {
        return caseAccessService.isAdministrator(username);
    }

    private boolean canAccessCase(String username, Map<String, Object> caseRow) {
        return caseAccessService.canAccessCase(username, caseRow);
    }

    private boolean isPreviousHandler(String username, String caseId) {
        return caseAccessService.isPreviousHandler(username, caseId);
    }

    private List<Map<String, Object>> previousHandlers(String caseId) {
        return caseAccessService.previousHandlers(caseId);
    }

    private boolean isAssignedLcForCase(String actor, Map<String, Object> caseRow) {
        return caseAccessService.isAssignedLcForCase(actor, caseRow);
    }

    private ResponseEntity<?> requireCaseActor(String caseId, String username) {
        return caseAccessService.requireCaseActor(caseId, username);
    }

    private Map<String, Object> singleCase(String caseId) {
        return caseAccessService.singleCase(caseId);
    }

    private Map<String, Object> userRow(String username) {
        return caseAccessService.userRow(username);
    }

    private boolean isTruthy(Object value) {
        return value instanceof Boolean ? (Boolean) value
                : value != null && ("1".equals(value.toString())
                                    || "true".equalsIgnoreCase(value.toString()));
    }

    @GetMapping("/lawyer/{lawyerId}")
    public ResponseEntity<?> getCasesByLawyer(@PathVariable String lawyerId) {
            String actor = authenticatedUsername();
            if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
            if (!actor.equals(lawyerId) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only view your own lawyer cases"));
            }
            String lawyerSql = "SELECT district, sub_county, parish, lawyer_specialization FROM users WHERE username = ?";
            List<Map<String, Object>> lawyerResult = jdbcTemplate.queryForList(lawyerSql, lawyerId);

            if (lawyerResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Lawyer not found"));
            }

            Map<String, Object> lawyer = lawyerResult.get(0);
            String district = (String) lawyer.get("district");
            String subCounty = (String) lawyer.get("sub_county");
            String parish = (String) lawyer.get("parish");
            String specialization = (String) lawyer.get("lawyer_specialization");

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

            List<Map<String, Object>> cases = jdbcTemplate.queryForList(
                    sql,
                    lawyerId, lawyerId,
                    district, parish, subCounty,
                    lawyerId, lawyerId
            );

            List<Map<String, Object>> filteredCases = new ArrayList<>();
            for (Map<String, Object> caseData : cases) {
                String caseSpecialization = (String) caseData.get("assigned_specialization");

                if (caseSpecialization != null && !caseSpecialization.isEmpty() &&
                        caseSpecialization.equalsIgnoreCase("Any") &&
                        !caseSpecialization.equalsIgnoreCase(specialization)) {

                    continue;
                }
                filteredCases.add(caseData);
            }

            return ResponseEntity.ok(Map.of("success", true, "cases", filteredCases));
    }

    @GetMapping("/available/lawyer/{lawyerId}")
    public ResponseEntity<?> getAvailableCasesForLawyer(@PathVariable String lawyerId) {
            String actor = authenticatedUsername();
            if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
            if (!actor.equals(lawyerId) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only view your own available cases"));
            }
            String lawyerSql = "SELECT district, parish, sub_county, lawyer_specialization FROM users WHERE username = ?";
            List<Map<String, Object>> lawyerResult = jdbcTemplate.queryForList(lawyerSql, lawyerId);

            if (lawyerResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Lawyer not found"));
            }

            String district = (String) lawyerResult.get(0).get("district");
            String parish = (String) lawyerResult.get(0).get("parish");
            String subCounty = (String) lawyerResult.get(0).get("sub_county");
            String specialization = (String) lawyerResult.get(0).get("lawyer_specialization");

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

            List<Map<String, Object>> cases = jdbcTemplate.queryForList(
                    sql,
                    lawyerId, lawyerId,
                    district, parish, subCounty,
                    lawyerId, lawyerId
            );

            return ResponseEntity.ok(Map.of("success", true, "cases", cases));
    }

    @GetMapping("/lc/{lcUsername}")
    public ResponseEntity<?> getCasesByLc(@PathVariable String lcUsername) {
            String actor = authenticatedUsername();
            if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
            if (!actor.equals(lcUsername) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only view your own LC cases"));
            }
            String lcSql = "SELECT district, role FROM users WHERE username = ?";
            List<Map<String, Object>> lcResult = jdbcTemplate.queryForList(lcSql, lcUsername);

            if (lcResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "LC official not found"));
            }

            String district = (String) lcResult.get(0).get("district");

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
                            )
                        ORDER BY
                            CASE
                                WHEN c.assigned_lc = ? OR c.current_handler = ? THEN 0
                                ELSE 1
                            END,
                            c.created_at DESC
                    """;

            List<Map<String, Object>> cases = jdbcTemplate.queryForList(
                    sql,
                    lcUsername, lcUsername,
                    district,
                    lcUsername, lcUsername
            );

            return ResponseEntity.ok(Map.of("success", true, "cases", cases));
    }

    @PutMapping("/{caseId}/accept/lc")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> acceptCaseByLc(@PathVariable String caseId) {
            String lcId = authenticatedUsername();
            if (lcId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> row = singleCase(caseId);
            if (row == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }
            if (!isAdministrator(lcId) && !isAssignedLcForCase(lcId, row)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only an LC official for this case's district may accept it"));
            }

            String sql = "UPDATE cases SET assigned_lc = ?, current_handler = ?, handler_role = ?, " +
                    "routing_status = 'accepted_by_lc', status = 'Accepted by LC' WHERE case_reference = ?";
            int updated = jdbcTemplate.update(sql, lcId, lcId, "LC Official", caseId);

            if (updated == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }

            auditLogService.logAction(
                    lcId, "LC Official", "CASE_ACCEPTED", "case", caseId,
                    "Case accepted by LC official: " + lcId
            );

            notifyCitizenCaseAccepted(caseId, lcId);

            return ResponseEntity.ok(Map.of("success", true, "message", "Case accepted successfully"));
    }

    @PostMapping
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> createCase(@RequestBody CreateCaseRequest caseData,
                                        HttpServletRequest request) {
            logger.info("📋 Received case data:");
            logger.info("  citizenPhone: " + caseData.getCitizenPhone());
            logger.info("  citizenEmail: " + caseData.getCitizenEmail());
            logger.info("  kinName: " + caseData.getKinName());
            logger.info("  kinPhone: " + caseData.getKinPhone());
            logger.info("  kinEmail: " + caseData.getKinEmail());
            logger.info("  kinRelationship: " + caseData.getKinRelationship());
            logger.info("  fullLocation: " + caseData.getFullLocation());

            String caseReference = caseData.getCaseReference();
            if (caseReference == null || caseReference.isEmpty()) {
                caseReference = generateCaseReference();
            }

            String caseType = caseData.getCaseType();
            String citizenId = caseData.getCitizenId();
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!isAdministrator(actor) && (citizenId == null || !actor.equals(citizenId))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only create a case for your own account"));
            }
            String description = caseData.getDescription();
            String district = caseData.getDistrict();
            String subCounty = caseData.getSubCounty();
            String parish = caseData.getParish();
            String village = caseData.getVillage();
            String status = caseData.getStatus();
            String currentLevel = caseData.getCurrentLevel();

            String citizenPhone = caseData.getCitizenPhone();
            String citizenEmail = caseData.getCitizenEmail();
            String kinName = caseData.getKinName();
            String kinPhone = caseData.getKinPhone();
            String kinEmail = caseData.getKinEmail();
            String kinRelationship = caseData.getKinRelationship();
            String fullLocation = caseData.getFullLocation();
            String attachedMedia = caseData.getAttachedMedia();
            String attachedFileData = caseData.getAttachedFileData();
            Long attachedFileSize = caseData.getAttachedFileSize() != null ? caseData.getAttachedFileSize() : 0L;
            String attachedFileType = caseData.getAttachedFileType();
            Boolean hasVoiceStatement = Boolean.TRUE.equals(caseData.getHasVoiceStatement());
            String voiceStatement = caseData.getVoiceStatement();
            Integer voiceDuration = caseData.getVoiceDuration() != null ? caseData.getVoiceDuration() : 0;
            Boolean hasVideoStatement = Boolean.TRUE.equals(caseData.getHasVideoStatement());
            String videoStatement = caseData.getVideoStatement();
            Integer videoDuration = caseData.getVideoDuration() != null ? caseData.getVideoDuration() : 0;
            String extraNotes = caseData.getExtraNotes();

            if (status == null || status.isEmpty()) status = "Pending";
            if (currentLevel == null || currentLevel.isEmpty()) currentLevel = "Citizen Desk";

            boolean caseTypeWasMissing = (caseType == null || caseType.isBlank());
            if (caseTypeWasMissing && description != null && !description.isBlank()) {
                try {
                    CaseClassificationService.Result classification =
                            caseClassificationService.classify(description, district);
                    caseType = classification.suggestedCaseType;
                    logger.info("No case category supplied — AI-suggested classification: {} (legalRagUsed={})",
                            caseType, classification.legalRagUsed);
                } catch (Exception ex) {
                    logger.info("⚠️ Case classification failed, defaulting to 'Others': " + ex.getMessage());
                    caseType = "Others";
                }
            } else if (caseTypeWasMissing) {
                caseType = "Others";
            }

            String routingChoice = caseData.getRoutingChoice();
            String lcLocationChoice = caseData.getLcLocationChoice();
            String lcLocationSource = caseData.getLcLocationSource();

            String sql = "INSERT INTO cases (" +
                    "case_reference, case_type, citizen_id, description, " +
                    "district, sub_county, parish, village, " +
                    "status, current_level, created_at, routing_status, " +
                    "citizen_phone, citizen_email, " +
                    "kin_name, kin_phone, kin_email, kin_relationship, " +
                    "full_location, " +
                    "attached_media, attached_file_data, attached_file_size, attached_file_type, " +
                    "has_voice_statement, voice_statement, voice_duration, " +
                    "has_video_statement, video_statement, video_duration, " +
                    "extra_notes" +
                    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pending_routing', " +
                    "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            jdbcTemplate.update(sql,
                    caseReference, caseType, citizenId, description,
                    district, subCounty, parish, village,
                    status, currentLevel,
                    citizenPhone, citizenEmail,
                    kinName, kinPhone, kinEmail, kinRelationship,
                    fullLocation,
                    attachedMedia, attachedFileData, attachedFileSize, attachedFileType,
                    hasVoiceStatement, voiceStatement, voiceDuration,
                    hasVideoStatement, videoStatement, videoDuration,
                    extraNotes
            );

            logger.info("✅ Case created with reference: " + caseReference);

            if ((lcLocationChoice != null && !lcLocationChoice.isEmpty())
                    || (lcLocationSource != null && !lcLocationSource.isEmpty())) {
                jdbcTemplate.update(
                        "UPDATE cases SET lc_location_choice = ?, lc_location_source = ? WHERE case_reference = ?",
                        lcLocationChoice, lcLocationSource, caseReference);
            }

            auditLogService.logAction(
                    citizenId,
                    "Citizen",
                    "CASE_CREATED",
                    "case",
                    caseReference,
                    "New case created: " + caseType +
                            " from " + district +
                            (subCounty != null ? ", " + subCounty : "") +
                            (parish != null ? ", " + parish : "") +
                            ", Status: " + status
            );

            String assignedTo = null;
            String assignedType = null;
            String routingMessage = "Case submitted successfully.";

            if ("legal_aid".equalsIgnoreCase(routingChoice)) {
                jdbcTemplate.update(
                        "UPDATE cases SET routing_choice = 'legal_aid' WHERE case_reference = ?",
                        caseReference);
                LawyerOffer offer = offerCaseToNextLawyer(caseReference, district, subCounty, parish, caseType, null);
                if (offer != null) {
                    assignedTo = offer.username;
                    assignedType = "Lawyer";
                    routingMessage = "We've matched your case to a lawyer and sent them the details. "
                            + "You'll be notified as soon as they respond.";
                } else {
                    routingMessage = "No lawyer is available for this case right now. "
                            + "Please see the suggested legal aid organisations.";
                }
            } else if ("lc".equalsIgnoreCase(routingChoice) || "police".equalsIgnoreCase(routingChoice)) {

                jdbcTemplate.update(
                        "UPDATE cases SET routing_status = 'info_only', routing_choice = ? WHERE case_reference = ?",
                        routingChoice.toLowerCase(), caseReference);
                routingMessage = "Your report has been recorded for your records.";
            } else {

                jdbcTemplate.update(
                        "UPDATE cases SET routing_status = 'awaiting_routing_choice' WHERE case_reference = ?",
                        caseReference);
                routingMessage = "Case submitted. Awaiting routing choice.";
            }

            createCitizenNotification(citizenId, caseReference, routingMessage);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", routingMessage != null ? routingMessage : "Case submitted successfully");
            response.put("caseReference", caseReference != null ? caseReference : "");
            response.put("assignedTo", assignedTo != null ? assignedTo : "");
            response.put("assignedType", assignedType != null ? assignedType : "");

            return ResponseEntity.ok(response);
    }

    @PostMapping("/classify")
    public ResponseEntity<?> classifyCase(@Valid @RequestBody ClassifyCaseRequest body) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String description = body.getDescription();
            String district = body.getDistrict();

            CaseClassificationService.Result result = caseClassificationService.classify(description, district);

            Map<String, Object> response = new HashMap<>();
            response.put("suggestedCaseType", result.suggestedCaseType);
            response.put("explanation", result.explanation);
            response.put("legalRagUsed", result.legalRagUsed);
            response.put("sources", result.sources);
            return ResponseEntity.ok(response);
    }

    private static class LawyerOffer {
        final String username;
        LawyerOffer(String username) { this.username = username; }
    }

    private LawyerOffer offerCaseToNextLawyer(String caseReference, String district, String subCounty,
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

    private void notifyLawyerOfAiOffer(String username, String caseReference) {
        try {
            String sql = "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) " +
                    "VALUES (?, ?, 'ai_case_offer', ?, false, NOW())";
            String message = "The system has matched case " + caseReference + " to you. Please accept or decline.";
            jdbcTemplate.update(sql, username, message, caseReference);
        } catch (Exception e) {
            logger.error("❌ Error notifying lawyer of AI offer: " + e.getMessage());
        }
    }

    @PostMapping("/ai/{caseId}/route")
    public ResponseEntity<?> routeAiCase(@PathVariable String caseId, @Valid @RequestBody RoutingChoiceRequest request) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> current = singleCase(caseId);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
            }
            String choice = request.getChoice();
            jdbcTemplate.update("UPDATE cases SET routing_choice = ? WHERE case_reference = ?", choice.toLowerCase(), caseId);

            if ("legal_aid".equalsIgnoreCase(choice)) {
                LawyerOffer offer = offerCaseToNextLawyer(
                        caseId, strVal(current.get("district")), strVal(current.get("sub_county")),
                        strVal(current.get("parish")), strVal(current.get("case_type")), null);
                if (offer == null) {
                    return ResponseEntity.ok(Map.of("success", true, "matched", false,
                            "message", "No lawyer available — please see suggested legal aid organisations."));
                }
                return ResponseEntity.ok(Map.of("success", true, "matched", true, "offeredTo", offer.username));
            }

            jdbcTemplate.update("UPDATE cases SET routing_status = 'info_only' WHERE case_reference = ?", caseId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Recorded for your records."));
    }

    @PutMapping("/{caseId}/offer/accept")
    public ResponseEntity<?> acceptAiOffer(@PathVariable String caseId) {
            String lawyerId = authenticatedUsername();
            if (lawyerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> current = singleCase(caseId);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
            }
            String selectedLawyer = strVal(current.get("selected_lawyer"));
            if (!lawyerId.equals(selectedLawyer) && !isAdministrator(lawyerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "This case was not offered to you"));
            }
            int updated = jdbcTemplate.update(
                    "UPDATE cases SET assigned_lawyer = ?, selected_lawyer_status = 'Accepted', " +
                            "routing_status = 'accepted_by_lawyer', status = 'Accepted by Lawyer' WHERE case_reference = ?",
                    lawyerId, caseId);
            if (updated == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
            }
            auditLogService.logAction(lawyerId, "Lawyer", "AI_CASE_OFFER_ACCEPTED", "case", caseId,
                    "AI-matched case offer accepted by " + lawyerId);
            notifyCitizenCaseAccepted(caseId, lawyerId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Case accepted"));
    }

    @PutMapping("/{caseId}/offer/decline")
    public ResponseEntity<?> declineAiOffer(@PathVariable String caseId) {
            String lawyerId = authenticatedUsername();
            if (lawyerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> current = singleCase(caseId);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
            }
            String selectedLawyer = strVal(current.get("selected_lawyer"));
            if (!lawyerId.equals(selectedLawyer) && !isAdministrator(lawyerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "This case was not offered to you"));
            }
            auditLogService.logAction(lawyerId, "Lawyer", "AI_CASE_OFFER_DECLINED", "case", caseId,
                    "AI-matched case offer declined by " + lawyerId);

            String declinedCsv = strVal(current.get("declined_lawyers"));
            String updatedCsv = (declinedCsv == null || declinedCsv.isBlank())
                    ? lawyerId : declinedCsv + "," + lawyerId;
            jdbcTemplate.update(
                    "UPDATE cases SET declined_lawyers = ?, selected_lawyer = NULL, " +
                            "selected_lawyer_status = NULL, routing_status = 'declined_awaiting_reselection' " +
                            "WHERE case_reference = ?",
                    updatedCsv, caseId);

            String citizenId = strVal(current.get("citizen_id"));
            if (citizenId != null && !citizenId.isBlank()) {
                String sql = "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) " +
                        "VALUES (?, ?, 'ai_case_declined', ?, false, NOW())";
                jdbcTemplate.update(sql, citizenId,
                        "The lawyer you selected for case " + caseId + " wasn't able to take it. " +
                                "Reopen the AI Assistant to choose another lawyer for this case.",
                        caseId);
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Offer declined; citizen notified to choose another lawyer."));
    }

    @PutMapping("/{caseId}/offer-to/{lawyerUsername}")
    public ResponseEntity<?> offerCaseToSpecificLawyer(@PathVariable String caseId, @PathVariable String lawyerUsername) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> current = singleCase(caseId);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
            }
            String citizenId = strVal(current.get("citizen_id"));
            if (!actor.equals(citizenId) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only the citizen who filed this case may choose a lawyer"));
            }
            String assignedLawyer = strVal(current.get("assigned_lawyer"));
            if (assignedLawyer != null && !assignedLawyer.isBlank()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "This case already has a lawyer assigned"));
            }
            String declinedCsv = strVal(current.get("declined_lawyers"));
            if (declinedCsv != null) {
                for (String u : declinedCsv.split(",")) {
                    if (u.trim().equalsIgnoreCase(lawyerUsername)) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(Map.of("error", "This lawyer already declined this case"));
                    }
                }
            }
            Integer lawyerExists = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE username = ? AND role = 'Lawyer' AND approval_status = 'Approved'",
                    Integer.class, lawyerUsername);
            if (lawyerExists == null || lawyerExists == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Lawyer not found"));
            }

            jdbcTemplate.update(
                    "UPDATE cases SET selected_lawyer = ?, selected_lawyer_status = 'Pending', " +
                            "routing_status = 'offered_to_lawyer', routing_choice = 'legal_aid' WHERE case_reference = ?",
                    lawyerUsername, caseId);
            notifyLawyerOfAiOffer(lawyerUsername, caseId);
            auditLogService.logAction(actor, "Citizen", "AI_CASE_OFFERED_TO_LAWYER", "case", caseId,
                    "Citizen selected lawyer " + lawyerUsername + " for case " + caseId);

            return ResponseEntity.ok(Map.of("success", true, "offeredTo", lawyerUsername));
    }

    @GetMapping("/citizen/{citizenId}/legal-aid-status")
    public ResponseEntity<?> getCitizenLegalAidStatus(@PathVariable String citizenId,
                                                        @RequestParam(required = false) String caseType) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }
            if (!actor.equals(citizenId) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied"));
            }

            LocalDateTime expiryCutoff = LocalDateTime.now().minusDays(LEGAL_AID_RESUME_EXPIRY_DAYS);
            String sql = "SELECT case_reference, case_type, description, district, sub_county, parish, " +
                    "routing_status, selected_lawyer, selected_lawyer_status, declined_lawyers, " +
                    "assigned_lawyer, created_at " +
                    "FROM cases WHERE citizen_id = ? AND routing_choice = 'legal_aid' " +
                    "AND (assigned_lawyer IS NULL OR assigned_lawyer = '') " +
                    "AND routing_status IN ('offered_to_lawyer', 'declined_awaiting_reselection', 'no_lawyer_available') " +
                    "AND created_at >= ? " +
                    (caseType != null && !caseType.isEmpty() ? "AND case_type = ? " : "") +
                    "ORDER BY created_at DESC LIMIT 1";
            List<Map<String, Object>> rows = (caseType != null && !caseType.isEmpty())
                    ? jdbcTemplate.queryForList(sql, citizenId, expiryCutoff, caseType)
                    : jdbcTemplate.queryForList(sql, citizenId, expiryCutoff);
            if (rows.isEmpty()) {
                return ResponseEntity.ok(Map.of("success", true, "hasActiveCase", false));
            }
            Map<String, Object> caseRow = rows.get(0);
            caseRow.put("success", true);
            caseRow.put("hasActiveCase", true);
            return ResponseEntity.ok(caseRow);
    }

    @GetMapping("/offers/lawyer/{username}")
    public ResponseEntity<?> getAiOffersForLawyer(@PathVariable String username) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }
            if (!actor.equals(username) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only view your own case offers"));
            }
            String sql = "SELECT c.case_reference AS caseId, c.case_type AS caseType, c.district, c.village, " +
                    "CONCAT(u.first_name, ' ', u.last_name) AS citizenName " +
                    "FROM cases c LEFT JOIN users u ON c.citizen_id = u.username " +
                    "WHERE c.selected_lawyer = ? AND c.selected_lawyer_status = 'Pending' " +
                    "ORDER BY c.created_at DESC";
            List<Map<String, Object>> offers = jdbcTemplate.queryForList(sql, username);
            return ResponseEntity.ok(Map.of("success", true, "offers", offers));
    }

    private String generateCaseReference() {
        String datePart = LocalDate.now().toString().replace("-", "");
        String countSql = "SELECT COUNT(*) FROM cases WHERE DATE(created_at) = CURDATE()";
        Integer count = jdbcTemplate.queryForObject(countSql, Integer.class);
        int nextNumber = (count != null ? count : 0) + 1;
        int randomSuffix = (int) (Math.random() * 9000) + 1000;
        return String.format("LCDJP-%s-%04d-%d", datePart, nextNumber, randomSuffix);
    }

    private void createCitizenNotification(String citizenId, String caseReference, String message) {
        if (citizenId == null || citizenId.isEmpty()) {
            logger.info("⚠️ Cannot create notification: citizenId is null or empty");
            return;
        }
        try {
            String sql = "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) " +
                    "VALUES (?, ?, 'case_created', ?, false, NOW())";
            String fullMessage = "✅ Your case " + caseReference + " has been submitted. " + message;
            jdbcTemplate.update(sql, citizenId, fullMessage, caseReference);
            logger.info("✅ Notification created for citizen: " + citizenId);
        } catch (Exception e) {
            logger.error("❌ Error notifying citizen: " + e.getMessage());
        }
    }

    private void notifyLawyer(String username, String caseReference) {
        try {
            String sql = "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) " +
                    "VALUES (?, ?, 'case_assigned', ?, false, NOW())";
            String message = "⚖️ New case " + caseReference + " has been assigned to you.";
            jdbcTemplate.update(sql, username, message, caseReference);
        } catch (Exception e) {
            logger.error("❌ Error notifying lawyer: " + e.getMessage());
        }
    }

    private void notifyCitizenCaseAccepted(String caseId, String providerId) {
        try {
            String citizenSql = "SELECT citizen_id FROM cases WHERE case_reference = ?";
            List<Map<String, Object>> result = jdbcTemplate.queryForList(citizenSql, caseId);

            if (!result.isEmpty()) {
                String citizenId = (String) result.get(0).get("citizen_id");

                if (citizenId == null || citizenId.isEmpty()) {
                    logger.info("⚠️ Cannot notify citizen: citizenId is null for case " + caseId);
                    return;
                }

                String sql = "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) " +
                        "VALUES (?, ?, 'case_accepted', ?, false, NOW())";
                String message = "✅ Your case " + caseId + " has been accepted by a legal service provider.";
                jdbcTemplate.update(sql, citizenId, message, caseId);
                logger.info("✅ Notification sent to citizen: " + citizenId);
            }
        } catch (Exception e) {
            logger.error("❌ Error notifying citizen: " + e.getMessage());
        }
    }

    @PutMapping("/{caseId}/accept/lawyer")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> acceptCaseByLawyer(@PathVariable String caseId,
                                                @Valid @RequestBody CaseActionRequest request) {
            String lawyerId = authenticatedUsername();
            if (lawyerId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            ResponseEntity<?> denied = requireCaseActor(caseId, lawyerId);
            if (denied != null && !isAdministrator(lawyerId)) {
                return denied;
            }
            if (!isAdministrator(lawyerId)
                    && !"LAWYER".equalsIgnoreCase(authenticatedRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only lawyers may accept lawyer cases"));
            }

            String sql = "UPDATE cases SET assigned_lawyer = ?, routing_status = 'accepted_by_lawyer', status = 'Accepted by Lawyer' WHERE case_reference = ?";
            int updated = jdbcTemplate.update(sql, lawyerId, caseId);

            if (updated == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }

            auditLogService.logAction(
                    lawyerId, "Lawyer", "CASE_ACCEPTED", "case", caseId,
                    "Case accepted by lawyer: " + lawyerId
            );

            notifyCitizenCaseAccepted(caseId, lawyerId);

            return ResponseEntity.ok(Map.of("success", true, "message", "Case accepted successfully"));
    }

    @PutMapping("/{caseId}/resolve")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> resolveCase(@PathVariable String caseId,
                                         @Valid @RequestBody CaseActionRequest request) {
            String resolvedBy = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseId, resolvedBy);
            if (denied != null) return denied;
            String resolvedByRole = authenticatedRole();

            String sql = "UPDATE cases SET status = 'Resolved', resolved_by_role = ?, resolved_at = NOW() WHERE case_reference = ?";
            int updated = jdbcTemplate.update(sql, resolvedByRole, caseId);

            if (updated == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }

            auditLogService.logAction(
                    resolvedBy,
                    resolvedByRole != null ? resolvedByRole : "Unknown",
                    "CASE_RESOLVED", "case", caseId,
                    "Case resolved by " + resolvedBy + " (" + resolvedByRole + ")"
            );

            return ResponseEntity.ok(Map.of("success", true, "message", "Case resolved successfully"));
    }

    @PutMapping("/{caseId}/advice")
    public ResponseEntity<?> saveLegalAdvice(
            @PathVariable String caseId,
            @Valid @RequestBody LegalAdviceRequest request) {
            String providedBy = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseId, providedBy);
            if (denied != null) return denied;
            String role = authenticatedRole();
            if (!"LAWYER".equalsIgnoreCase(role) && !isAdministrator(providedBy)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only the assigned lawyer may provide legal advice"));
            }
            String adviceText = request.getLegalAdvice();

            String sql = "UPDATE cases SET legal_advice = ?, legal_advice_provided_by = ?, legal_advice_date = NOW() WHERE case_reference = ?";
            int updated = jdbcTemplate.update(sql, adviceText, providedBy, caseId);

            if (updated > 0) {
                auditLogService.logAction(
                        providedBy, "Lawyer", "LEGAL_ADVICE_ADDED", "case", caseId,
                        "Legal advice added by: " + providedBy
                );
                return ResponseEntity.ok(Map.of("success", true, "message", "Legal advice saved successfully"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Case not found"));
    }

    @PostMapping("/{caseId}/messages")
    public ResponseEntity<?> addMessage(
            @PathVariable String caseId,
            @Valid @RequestBody AddMessageRequest messageData,
            HttpServletRequest httpRequest) {

            String fromUsername = authenticatedUsername();
            if (fromUsername == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> caseRow = singleCase(caseId);
            if (caseRow == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }
            String caseCitizen = strVal(caseRow.get("citizen_id"));
            String currentHandler = strVal(caseRow.get("current_handler"));
            String assignedLc = strVal(caseRow.get("assigned_lc"));
            String assignedLawyer = strVal(caseRow.get("assigned_lawyer"));
            if (!isAdministrator(fromUsername)
                    && !fromUsername.equals(caseCitizen)
                    && !fromUsername.equals(currentHandler)
                    && !fromUsername.equals(assignedLc)
                    && !fromUsername.equals(assignedLawyer)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Previous handlers have view-only access to this case"));
            }
            if (!isAdministrator(fromUsername)
                    && isTruthy(caseRow.get("messaging_locked"))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Messaging is locked for this case"));
            }

            Map<String, Object> actor = userRow(fromUsername);
            String from = strVal(actor.get("role"));
            String fromName = (strVal(actor.get("first_name")) + " "
                    + strVal(actor.get("last_name"))).trim();
            String text = messageData.getText();
            String sentTo = fromUsername.equals(caseCitizen) ? currentHandler : caseCitizen;
            String sentToRole = fromUsername.equals(caseCitizen)
                    ? strVal(caseRow.get("handler_role")) : "Citizen";
            Boolean read = messageData.getRead();
            Boolean preAcceptance = messageData.getPreAcceptance();
            String timestamp = normalizeTimestamp(messageData.getTimestamp());

            String sql = "INSERT INTO case_messages " +
                    "(case_id, from_user, from_name, from_username, message_text, " +
                    " sent_to, sent_to_role, timestamp, is_read, pre_acceptance) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            jdbcTemplate.update(sql,
                    caseId, from, fromName, fromUsername, text,
                    sentTo, sentToRole, timestamp,
                    read != null && read,
                    preAcceptance != null && preAcceptance);

            auditLogService.logAction(
                    fromUsername, fromName, "MESSAGE_ADDED", "case", caseId,
                    "Message added by " + fromName + " (" + from + ")"
            );

            return ResponseEntity.ok(Map.of("success", true, "message", "Message sent successfully"));
    }

    @GetMapping("/{caseId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable String caseId) {
            String actor = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseId, actor);
            if (denied != null) return denied;
            String sql = "SELECT * FROM case_messages WHERE case_id = ? ORDER BY timestamp ASC";
            List<Map<String, Object>> messages = jdbcTemplate.queryForList(sql, caseId);
            return ResponseEntity.ok(messages);
    }

    @PutMapping("/{caseId}/messages/{messageId}/read")
    public ResponseEntity<?> markMessageAsRead(
            @PathVariable String caseId,
            @PathVariable Integer messageId) {
            String actor = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseId, actor);
            if (denied != null) return denied;
            String sql = "UPDATE case_messages SET is_read = true WHERE id = ? AND case_id = ?";
            int updated = jdbcTemplate.update(sql, messageId, caseId);

            if (updated > 0) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Message marked as read"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Message not found"));
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getCaseAnalytics() {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators may view case analytics"));
            }

            Map<String, Object> actorRow = userRow(actor);
            String role = strVal(actorRow.get("role")).toUpperCase().replace(' ', '_');
            boolean isDistrictAdmin = role.equals("DISTRICT_ADMIN");

            String district = null;
            if (isDistrictAdmin) {
                district = strVal(actorRow.get("district"));
                if (district.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }
            }

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

            return ResponseEntity.ok(result);
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

    @GetMapping("/statistics")
    @Cacheable(value = "statistics", key = "'cases'")
    public ResponseEntity<?> getStatistics() {
            int total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases", Integer.class);
            int pending = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE status = 'Pending'", Integer.class);
            int resolved = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE status = 'Resolved'", Integer.class);
            int forwarded = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE status = 'Forwarded'", Integer.class);
            int assigned = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE routing_status IN ('assigned_to_lc', 'assigned_to_lawyer', 'assigned_to_org')", Integer.class);
            int available = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE routing_status IN ('available_to_all_lawyers', 'pending_routing', 'pending_admin')", Integer.class);

            Map<String, Object> stats = new HashMap<>();
            stats.put("total", total);
            stats.put("pending", pending);
            stats.put("resolved", resolved);
            stats.put("forwarded", forwarded);
            stats.put("assigned", assigned);
            stats.put("available", available);

            return ResponseEntity.ok(Map.of("success", true, "statistics", stats));
    }

    @DeleteMapping("/{caseId}")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> deleteCase(@PathVariable String caseId) {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators may delete cases"));
            }
            String sql = "DELETE FROM cases WHERE case_reference = ?";
            int deleted = jdbcTemplate.update(sql, caseId);

            if (deleted == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }

            auditLogService.logAction(
                    actor, authenticatedRole(), "CASE_DELETED", "case", caseId,
                    "Case deleted by administrator"
            );

            return ResponseEntity.ok(Map.of("success", true, "message", "Case deleted successfully"));
    }

    @PutMapping("/{caseId}/assign")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> assignHandler(
            @PathVariable String caseId,
            @Valid @RequestBody AssignHandlerRequest request) {

        Map<String, Object> response = new HashMap<>();
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators may assign handlers"));
            }
            String currentHandler = request.getCurrentHandler();
            String handlerRole = request.getHandlerRole();
            Boolean messagingEnabled = request.getMessagingEnabled() != null
                    ? Boolean.parseBoolean(request.getMessagingEnabled().toString()) : true;
            Boolean messagingLocked = request.getMessagingLocked() != null
                    ? Boolean.parseBoolean(request.getMessagingLocked().toString()) : false;

            String checkSql = "SELECT COUNT(*) FROM cases WHERE case_reference = ?";
            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, caseId);

            if (count == null || count == 0) {
                response.put("success", false);
                response.put("message", "Case not found: " + caseId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            int rows = jdbcTemplate.update(
                    "UPDATE cases SET current_handler = ?, handler_role = ?, " +
                            "messaging_enabled = ?, messaging_locked = ?, " +
                            "routing_status = 'assigned_by_admin', " +
                            "status = 'Assigned' " +
                            "WHERE case_reference = ?",
                    currentHandler, handlerRole,
                    messagingEnabled ? 1 : 0,
                    messagingLocked ? 1 : 0,
                    caseId
            );

            if (rows == 0) {
                response.put("success", false);
                response.put("message", "Failed to update case: " + caseId);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }

            auditLogService.logAction(
                    currentHandler != null ? currentHandler : "system",
                    handlerRole != null ? handlerRole : "Unknown",
                    "CASE_ASSIGNED",
                    "case",
                    caseId,
                    "Handler assigned: " + currentHandler + " (" + handlerRole + ")"
            );

            response.put("success", true);
            response.put("message", "Handler assigned successfully");
            response.put("currentHandler", currentHandler);
            response.put("handlerRole", handlerRole);
            response.put("messagingEnabled", messagingEnabled);
            return ResponseEntity.ok(response);
    }

    @PutMapping("/{caseId}")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> updateCase(
            @PathVariable String caseId,
            @Valid @RequestBody CaseUpdateRequest request) {

        Map<String, Object> response = new HashMap<>();
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            Map<String, Object> existingCase = singleCase(caseId);
            if (existingCase == null) {
                response.put("success", false);
                response.put("message", "Case not found: " + caseId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            if (!canAccessCase(actor, existingCase) && !isAssignedLcForCase(actor, existingCase)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You do not have access to this case"));
            }

            String referredToVal = request.containsKey("referred_to")
                    ? strVal(request.get("referred_to")) : strVal(request.get("referredTo"));
            boolean isReferralRequest = !referredToVal.isEmpty();

            boolean isCitizenReopen = "reopened_by_citizen".equalsIgnoreCase(strVal(request.get("routing_status")));

            if (isReferralRequest) {
                if (!isAdministrator(actor) && !isAssignedLcForCase(actor, existingCase)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Only the LC official handling this case may refer it"));
                }
                String referralNotes = request.containsKey("lc_referral_notes")
                        ? strVal(request.get("lc_referral_notes")) : strVal(request.get("lcReferralNotes"));
                if (referralNotes.isEmpty()) {
                    response.put("success", false);
                    response.put("error", "lc_referral_notes is required when referring a case");
                    return ResponseEntity.badRequest().body(response);
                }
            } else if (isCitizenReopen) {
                if (!isAdministrator(actor) && !actor.equals(strVal(existingCase.get("citizen_id")))) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Only the citizen who filed this case may reopen it"));
                }
            } else if (!isAdministrator(actor) && (request.containsKey("status")
                    || request.containsKey("currentHandler")
                    || request.containsKey("current_handler")
                    || request.containsKey("handlerRole")
                    || request.containsKey("handler_role")
                    || request.containsKey("messagingEnabled")
                    || request.containsKey("messaging_enabled")
                    || request.containsKey("messagingLocked")
                    || request.containsKey("messaging_locked")
                    || request.containsKey("assignedLawyer")
                    || request.containsKey("assigned_lawyer")
                    || request.containsKey("routing_status"))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Status and handler ownership changes must be performed by the server"));
            }
            StringBuilder sql = new StringBuilder("UPDATE cases SET ");
            List<Object> params = new ArrayList<>();
            boolean first = true;

            if (request.containsKey("status")) {
                if (!first) sql.append(", ");
                sql.append("status = ?");
                params.add(request.get("status"));
                first = false;
            }
            if (request.containsKey("currentHandler") || request.containsKey("current_handler")) {
                if (!first) sql.append(", ");
                sql.append("current_handler = ?");
                params.add(request.containsKey("currentHandler")
                        ? request.get("currentHandler") : request.get("current_handler"));
                first = false;
            }
            if (request.containsKey("handlerRole") || request.containsKey("handler_role")) {
                if (!first) sql.append(", ");
                sql.append("handler_role = ?");
                params.add(request.containsKey("handlerRole")
                        ? request.get("handlerRole") : request.get("handler_role"));
                first = false;
            }
            if (request.containsKey("messagingEnabled") || request.containsKey("messaging_enabled")) {
                if (!first) sql.append(", ");
                sql.append("messaging_enabled = ?");
                Object messagingEnabledVal = request.containsKey("messagingEnabled")
                        ? request.get("messagingEnabled") : request.get("messaging_enabled");
                params.add(isTruthy(messagingEnabledVal) ? 1 : 0);
                first = false;
            }
            if (request.containsKey("messagingLocked") || request.containsKey("messaging_locked")) {
                if (!first) sql.append(", ");
                sql.append("messaging_locked = ?");
                Object messagingLockedVal = request.containsKey("messagingLocked")
                        ? request.get("messagingLocked") : request.get("messaging_locked");
                params.add(isTruthy(messagingLockedVal) ? 1 : 0);
                first = false;
            }
            if (request.containsKey("legalAdvice")) {
                if (!first) sql.append(", ");
                sql.append("legal_advice = ?");
                params.add(request.get("legalAdvice"));
                first = false;
            }
            if (request.containsKey("timeline")) {
                if (!first) sql.append(", ");
                sql.append("timeline = ?");
                params.add(request.get("timeline"));
                first = false;
            }

            if (request.containsKey("extraNotes")) {
                if (!first) sql.append(", ");
                sql.append("extra_notes = ?");
                params.add(request.get("extraNotes"));
                first = false;
            }
            if (request.containsKey("attachedMedia")) {
                if (!first) sql.append(", ");
                sql.append("attached_media = ?");
                params.add(request.get("attachedMedia"));
                first = false;
            }
            if (request.containsKey("attachedFileData")) {
                if (!first) sql.append(", ");
                sql.append("attached_file_data = ?");
                params.add(request.get("attachedFileData"));
                first = false;
            }
            if (request.containsKey("attachedFileSize")) {
                if (!first) sql.append(", ");
                sql.append("attached_file_size = ?");
                Object size = request.get("attachedFileSize");
                params.add(size instanceof Number ? ((Number) size).longValue()
                        : Long.parseLong(size.toString()));
                first = false;
            }
            if (request.containsKey("attachedFileType")) {
                if (!first) sql.append(", ");
                sql.append("attached_file_type = ?");
                params.add(request.get("attachedFileType"));
                first = false;
            }
            if (request.containsKey("voiceNoteData")) {
                if (!first) sql.append(", ");
                sql.append("voice_note_data = ?");
                params.add(request.get("voiceNoteData"));
                first = false;
            }
            if (request.containsKey("voiceNoteDuration")) {
                if (!first) sql.append(", ");
                sql.append("voice_note_duration = ?");
                Object duration = request.get("voiceNoteDuration");
                params.add(duration instanceof Number ? ((Number) duration).intValue()
                        : Integer.parseInt(duration.toString()));
                first = false;
            }
            if (request.containsKey("assignedLawyer") || request.containsKey("assigned_lawyer")) {
                if (!first) sql.append(", ");
                sql.append("assigned_lawyer = ?");
                params.add(request.getOrDefault("assignedLawyer", request.get("assigned_lawyer")));
                first = false;
            }
            if (request.containsKey("resolvedBy") || request.containsKey("resolved_by")) {
                if (!first) sql.append(", ");
                sql.append("resolved_by = ?");
                params.add(request.getOrDefault("resolvedBy", request.get("resolved_by")));
                first = false;
            }
            if (request.containsKey("resolutionDetails") || request.containsKey("resolution_details")) {
                if (!first) sql.append(", ");
                sql.append("resolution_details = ?");
                params.add(request.getOrDefault("resolutionDetails", request.get("resolution_details")));
                first = false;
            }
            if (request.containsKey("current_level")) {
                if (!first) sql.append(", ");
                sql.append("current_level = ?");
                params.add(request.get("current_level"));
                first = false;
            }
            if (request.containsKey("routing_status")) {
                if (!first) sql.append(", ");
                sql.append("routing_status = ?");
                params.add(request.get("routing_status"));
                first = false;
            }
            if (request.containsKey("lc_comments") || request.containsKey("lcComments")) {
                if (!first) sql.append(", ");
                sql.append("lc_comments = ?");
                params.add(request.containsKey("lc_comments")
                        ? request.get("lc_comments") : request.get("lcComments"));
                first = false;
            }
            if (request.containsKey("lc_statements")) {
                if (!first) sql.append(", ");
                sql.append("lc_statements = ?");
                params.add(request.get("lc_statements"));
                first = false;
            }
            if (request.containsKey("lc_evidence_file")) {
                if (!first) sql.append(", ");
                sql.append("lc_evidence_file = ?");
                params.add(request.get("lc_evidence_file"));
                first = false;
            }
            if (request.containsKey("selected_lawyer")) {
                if (!first) sql.append(", ");
                sql.append("selected_lawyer = ?");
                params.add(request.get("selected_lawyer"));
                first = false;
            }
            if (request.containsKey("selected_lawyer_status")) {
                if (!first) sql.append(", ");
                sql.append("selected_lawyer_status = ?");
                params.add(request.get("selected_lawyer_status"));
                first = false;
            }
            if (request.containsKey("assigned_specialization")) {
                if (!first) sql.append(", ");
                sql.append("assigned_specialization = ?");
                params.add(request.get("assigned_specialization"));
                first = false;
            }
            if (request.containsKey("selected_lawyer_name")) {
                if (!first) sql.append(", ");
                sql.append("selected_lawyer_name = ?");
                params.add(request.get("selected_lawyer_name"));
                first = false;
            }
            if (request.containsKey("selected_lawyer_specialization")) {
                if (!first) sql.append(", ");
                sql.append("selected_lawyer_specialization = ?");
                params.add(request.get("selected_lawyer_specialization"));
                first = false;
            }
            if (request.containsKey("accepted_date")) {
                if (!first) sql.append(", ");
                sql.append("accepted_date = ?");
                params.add(request.get("accepted_date"));
                first = false;
            }
            if (request.containsKey("assigned_lawyer")) {
                if (!first) sql.append(", ");
                sql.append("assigned_lawyer = ?");
                params.add(request.get("assigned_lawyer"));
                first = false;
            }
            if (request.containsKey("assigned_lc")) {
                if (!first) sql.append(", ");
                sql.append("assigned_lc = ?");
                params.add(request.get("assigned_lc"));
                first = false;
            }
            if (request.containsKey("assigned_org")) {
                if (!first) sql.append(", ");
                sql.append("assigned_org = ?");
                params.add(request.get("assigned_org"));
                first = false;
            }
            if (request.containsKey("available_lawyers")) {
                if (!first) sql.append(", ");
                sql.append("available_lawyers = ?");
                params.add(request.get("available_lawyers"));
                first = false;
            }
            if (request.containsKey("routingChoice") || request.containsKey("routing_choice")) {
                if (!first) sql.append(", ");
                sql.append("routing_choice = ?");
                params.add(request.containsKey("routingChoice")
                        ? request.get("routingChoice") : request.get("routing_choice"));
                first = false;
            }
            if (request.containsKey("lc_referral_notes") || request.containsKey("lcReferralNotes")) {
                if (!first) sql.append(", ");
                sql.append("lc_referral_notes = ?");
                params.add(request.containsKey("lc_referral_notes")
                        ? request.get("lc_referral_notes") : request.get("lcReferralNotes"));
                first = false;
            }
            if (request.containsKey("referred_to") || request.containsKey("referredTo")) {
                if (!first) sql.append(", ");
                sql.append("referred_to = ?");
                params.add(request.containsKey("referred_to")
                        ? request.get("referred_to") : request.get("referredTo"));
                first = false;
            }
            if (request.containsKey("referred_by") || request.containsKey("referredBy")) {
                if (!first) sql.append(", ");
                sql.append("referred_by = ?");
                params.add(request.containsKey("referred_by")
                        ? request.get("referred_by") : request.get("referredBy"));
                first = false;
            }
            if (request.containsKey("lcLocationChoice") || request.containsKey("lc_location_choice")) {
                if (!first) sql.append(", ");
                sql.append("lc_location_choice = ?");
                params.add(request.containsKey("lcLocationChoice")
                        ? request.get("lcLocationChoice") : request.get("lc_location_choice"));
                first = false;
            }
            if (request.containsKey("lcLocationSource") || request.containsKey("lc_location_source")) {
                if (!first) sql.append(", ");
                sql.append("lc_location_source = ?");
                params.add(request.containsKey("lcLocationSource")
                        ? request.get("lcLocationSource") : request.get("lc_location_source"));
                first = false;
            }

            if (first) {
                response.put("success", false);
                response.put("message", "No fields to update");
                return ResponseEntity.badRequest().body(response);
            }

            sql.append(" WHERE case_reference = ?");
            params.add(caseId);

            int rows = jdbcTemplate.update(sql.toString(), params.toArray());
            if (rows == 0) {
                response.put("success", false);
                response.put("message", "Case not found: " + caseId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            if (isReferralRequest) {
                auditLogService.logAction(
                        actor,
                        "LC Official",
                        "CASE_FORWARDED",
                        "case",
                        caseId,
                        "Case referred to " + referredToVal + " by " + actor
                );
            }

            auditLogService.logAction(
                    "system",
                    "Admin",
                    "CASE_UPDATED",
                    "case",
                    caseId,
                    "Case updated: " + request.keySet().toString()
            );

            response.put("success", true);
            response.put("message", "Case updated successfully");
            return ResponseEntity.ok(response);
    }

    private String normalizeTimestamp(Object timestampObj) {
        if (timestampObj == null) {
            return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }

        try {
            if (timestampObj instanceof java.sql.Timestamp) {
                java.sql.Timestamp ts = (java.sql.Timestamp) timestampObj;
                return ts.toLocalDateTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            } else if (timestampObj instanceof java.util.Date) {
                java.util.Date date = (java.util.Date) timestampObj;
                return new java.sql.Timestamp(date.getTime())
                        .toLocalDateTime()
                        .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            } else if (timestampObj instanceof String) {
                String ts = (String) timestampObj;

                if (ts.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.*")) {
                    return ts.split("\\.")[0];
                }

                try {
                    LocalDateTime dateTime = LocalDateTime.parse(ts);
                    return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                } catch (Exception e) {
                    try {
                        DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
                        LocalDateTime dateTime = LocalDateTime.parse(ts, formatter);
                        return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    } catch (Exception e2) {
                        return ts;
                    }
                }
            } else {
                return timestampObj.toString();
            }
        } catch (Exception e) {
            logger.error("Error normalizing timestamp: " + e.getMessage());
            return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
    }

    @GetMapping("/open")
    public ResponseEntity<?> getOpenCases() {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Administrator access required"));
            }
            String sql = "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
                    "FROM cases c " +
                    "LEFT JOIN users u ON c.citizen_id = u.username " +
                    "WHERE c.status NOT IN ('Resolved', 'Closed') " +
                    "ORDER BY c.created_at DESC";
            List<Map<String, Object>> cases = jdbcTemplate.queryForList(sql);
            return ResponseEntity.ok(Map.of("success", true, "cases", cases));
    }

    @GetMapping("/stats/open")
    public ResponseEntity<?> countOpenCases() {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Administrator access required"));
            }
            String sql = "SELECT COUNT(*) FROM cases WHERE status NOT IN ('Resolved', 'Closed')";
            Long count = jdbcTemplate.queryForObject(sql, Long.class);
            return ResponseEntity.ok(Map.of("success", true, "count", count));
    }

    @GetMapping("/officer/{officerId}")
    public ResponseEntity<?> getCasesByOfficer(@PathVariable String officerId) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!actor.equals(officerId) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only view your own assigned cases"));
            }
            String sql = "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
                    "FROM cases c " +
                    "LEFT JOIN users u ON c.citizen_id = u.username " +
                    "WHERE c.current_handler = ? " +
                    "ORDER BY c.created_at DESC";
            List<Map<String, Object>> cases = jdbcTemplate.queryForList(sql, officerId);
            return ResponseEntity.ok(Map.of("success", true, "cases", cases));
    }

    @PutMapping("/{caseId}/status")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> updateCaseStatus(
            @PathVariable String caseId,
            @RequestParam String status) {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators may update case status"));
            }
            String sql = "UPDATE cases SET status = ? WHERE case_reference = ?";
            int updated = jdbcTemplate.update(sql, status, caseId);

            if (updated == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }

            auditLogService.logAction(
                    "system",
                    "Admin",
                    "CASE_STATUS_UPDATED",
                    "case",
                    caseId,
                    "Status updated to: " + status
            );

            return ResponseEntity.ok(Map.of("success", true, "message", "Status updated"));
    }

    @PostMapping("/backup")
    public ResponseEntity<?> backupDatabase() {
        String actor = authenticatedUsername();
        if (actor == null || !isSystemAdministrator(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only a System Administrator may create a database backup"));
        }

        String backupDir = "./backups/";
            new File(backupDir).mkdirs();
            String filename = backupDir + "lcdjp_backup_"
                    + LocalDate.now() + "_" + System.currentTimeMillis() + ".sql";

            String[] target = parseDatasourceTarget(datasourceUrl);
            String host = target[0];
            String port = target[1];
            String database = target[2];

            List<String> command = new ArrayList<>(List.of(
                    "mysqldump",
                    "-h", host,
                    "-P", port,
                    "-u", datasourceUsername,
                    "--databases", database,
                    "--result-file=" + filename
            ));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.environment().put("MYSQL_PWD", datasourcePassword == null ? "" : datasourcePassword);
            pb.redirectErrorStream(true);

            Process process;
            boolean finished;
            try {
                process = pb.start();
                finished = process.waitFor(5, java.util.concurrent.TimeUnit.MINUTES);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Database backup was interrupted", ie);
            } catch (IOException ioe) {
                throw new IllegalStateException("Could not start mysqldump for database backup", ioe);
            }
            int exitCode = finished ? process.exitValue() : -1;
            if (!finished) process.destroyForcibly();

            auditLogService.logAction(
                    actor,
                    "SYSTEM_ADMIN",
                    "DATABASE_BACKUP",
                    "database",
                    database,
                    exitCode == 0 ? "Backup created: " + filename
                                  : "Backup attempt failed (exit code " + exitCode + ")"
            );

            if (exitCode == 0) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Backup created: " + filename));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Backup failed"));
    }

    private boolean isSystemAdministrator(String username) {
        String role = strVal(userRow(username).get("role")).toUpperCase().replace(' ', '_');
        return role.equals("ADMIN") || role.equals("SYSTEM_ADMIN") || role.equals("SYSTEM_ADMINISTRATOR");
    }

    private String[] parseDatasourceTarget(String jdbcUrl) {
        String host = "localhost";
        String port = "3306";
        String database = "lcdjp";
        if (jdbcUrl != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("jdbc:mysql://([^:/]+)(?::(\\d+))?/([^?]+)")
                    .matcher(jdbcUrl);
            if (m.find()) {
                host = m.group(1);
                if (m.group(2) != null) port = m.group(2);
                database = m.group(3);
            }
        }
        return new String[]{host, port, database};
    }

    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());
        health.put("server", "LCDJP Backend");
        health.put("version", "1.0.0");

        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            health.put("database", "UP");
        } catch (Exception e) {
            logger.error("❌ Health check database probe failed", e);
            health.put("database", "DOWN");
        }

        return ResponseEntity.ok(health);
    }

    @PutMapping("/{caseNumber}/status")
    @CacheEvict(value = "statistics", allEntries = true)
    public ResponseEntity<?> updateCaseStatus(@PathVariable String caseNumber,
                                              @Valid @RequestBody CaseStatusUpdateRequest request) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            ResponseEntity<?> denied = requireCaseHandler(caseNumber, actor);
            if (denied != null) return denied;

            String actorRole = authenticatedRole();

            Case updatedCase = caseService.updateCaseStatus(
                    caseNumber,
                    request.getNewStatus(),
                    request.getComment(),
                    actor,
                    actorRole
            );

            String notificationMessage = String.format(
                    "Your case %s status has been updated to: %s",
                    caseNumber, request.getNewStatus()
            );
            notificationService.createNotification(
                    updatedCase.getCitizenId(),
                    notificationMessage,
                    "CASE_UPDATE",
                    actor,
                    actor,
                    actorRole
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Case status updated successfully",
                    "case", updatedCase
            ));
    }

    private ResponseEntity<?> requireCaseHandler(String caseId, String username) {
        Map<String, Object> row = singleCase(caseId);
        if (row == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Case not found"));
        }
        if (isAdministrator(username)
                || username.equals(strVal(row.get("current_handler")))
                || username.equals(strVal(row.get("assigned_lc")))
                || username.equals(strVal(row.get("assigned_lawyer")))
                || username.equals(strVal(row.get("selected_lawyer")))) {
            return null;
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Only an administrator or this case's assigned handler may change its status"));
    }

    @GetMapping("/citizen/{citizenId}")
    public ResponseEntity<?> getCitizenCases(@PathVariable String citizenId) {
        logger.info("🔍 GET /api/cases/citizen/" + citizenId + " called");
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            if (!isAdministrator(actor) && citizenId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Citizen username is required"));
            }
            String requestedCitizen = isAdministrator(actor) ? citizenId : actor;
            List<Case> cases = caseService.getCasesByCitizen(requestedCitizen);
            logger.info("✅ Found " + cases.size() + " cases");
            return ResponseEntity.ok(Map.of("success", true, "cases", cases));
    }

    @GetMapping("/status-history/{caseNumber}")
    public ResponseEntity<?> getCaseStatusHistory(@PathVariable String caseNumber) {
            String actor = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseNumber, actor);
            if (denied != null) return denied;
            Case caseEntity = caseService.getCaseByNumber(caseNumber);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "caseNumber", caseNumber,
                    "currentStatus", caseEntity.getCaseStatus(),
                    "history", caseEntity.getStatusHistory()
            ));
    }
}