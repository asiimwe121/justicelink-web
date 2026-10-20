package lcdjp.cases;

import lcdjp.legal.LegalAdviceRequest;
import lcdjp.notification.NotificationService;
import lcdjp.storage.StoredFileCleanupService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.util.ArrayList;
import java.time.LocalDate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;

/**
 * Case endpoints: list, read, assign, accept, resolve, delete and status. Creating and updating a
 * case are delegated to {@link CaseCreationService} and {@link CaseUpdateService}.
 */
@RestController
@RequestMapping("/api/cases")
public class CaseController extends CaseApiSupport {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseController.class);
    @Autowired
    private CaseCreationService caseCreationService;

    @Autowired
    private CaseUpdateService caseUpdateService;

    @Autowired
    private CaseService caseService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CaseClassificationService caseClassificationService;

    @Autowired
    private CaseQueryRepository caseQueries;

    /** Optional: removes the files (and dependent rows) of a deleted case from object storage / MySQL. */
    @Autowired(required = false)
    private StoredFileCleanupService fileCleanup;

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

            List<Map<String, Object>> cases;
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);

            if (paginated) {
                int resolvedPage = (page == null || page < 1) ? 1 : page;
                int resolvedPageSize = resolvedPageSize(pageSize);
                int offset = (resolvedPage - 1) * resolvedPageSize;
                long totalCount = caseQueries.countCases(conditions, args);
                cases = caseQueries.listCasesPage(conditions, args, resolvedPageSize, offset);

                body.put("page", resolvedPage);
                body.put("pageSize", resolvedPageSize);
                body.put("totalCount", totalCount);
            } else {
                cases = caseQueries.listCasesCapped(conditions, args, UNPAGINATED_HARD_CAP);
                warnIfTruncated(cases.size(), conditions.isEmpty() ? "unfiltered" : "filtered:" + conditions);
            }
            body.put("cases", CaseRows.open(cases));
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
            List<Map<String, Object>> results = caseQueries.findCaseWithCitizen(caseId);

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

            auditAdminCaseView(actor, caseId, "case");
            Map<String, Object> caseData = normalizeCase(CaseRows.open(results.get(0)));
            return ResponseEntity.ok(Map.of("success", true, "case", caseData));
    }

    @GetMapping("/{caseId}/access-log")
    public ResponseEntity<?> getCaseAccessLog(@PathVariable String caseId) {
        String actor = authenticatedUsername();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        String role = strVal(authenticatedRole()).toUpperCase().replace(' ', '_');
        boolean systemAdmin = role.equals("ADMIN") || role.equals("SYSTEM_ADMIN")
                || role.equals("SYSTEM_ADMINISTRATOR");
        if (!systemAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only system administrators can view the case access log"));
        }
        if (singleCase(caseId) == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "caseId", caseId,
                "entries", auditLogService.getCaseAccessLog(caseId)));
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

    @GetMapping("/lawyer/{lawyerId}")
    public ResponseEntity<?> getCasesByLawyer(@PathVariable String lawyerId) {
            String actor = authenticatedUsername();
            if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
            if (!actor.equals(lawyerId) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only view your own lawyer cases"));
            }
            List<Map<String, Object>> lawyerResult = caseQueries.findLawyerArea(lawyerId);

            if (lawyerResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Lawyer not found"));
            }

            Map<String, Object> lawyer = lawyerResult.get(0);
            String district = (String) lawyer.get("district");
            String subCounty = (String) lawyer.get("sub_county");
            String parish = (String) lawyer.get("parish");
            String specialization = (String) lawyer.get("lawyer_specialization");

            List<Map<String, Object>> cases = caseQueries.findCasesForLawyer(lawyerId, district, subCounty, parish);

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

            return ResponseEntity.ok(Map.of("success", true, "cases", CaseRows.open(filteredCases)));
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
            List<Map<String, Object>> lawyerResult = caseQueries.findLawyerAreaForAvailable(lawyerId);

            if (lawyerResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Lawyer not found"));
            }

            String district = (String) lawyerResult.get(0).get("district");
            String parish = (String) lawyerResult.get(0).get("parish");
            String subCounty = (String) lawyerResult.get(0).get("sub_county");
            String specialization = (String) lawyerResult.get(0).get("lawyer_specialization");

            List<Map<String, Object>> cases =
                    caseQueries.findAvailableCasesForLawyer(lawyerId, district, parish, subCounty);

            return ResponseEntity.ok(Map.of("success", true, "cases", CaseRows.open(cases)));
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
            List<Map<String, Object>> lcResult = caseQueries.findLcProfile(lcUsername);

            if (lcResult.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "LC official not found"));
            }

            String district = (String) lcResult.get(0).get("district");

            List<Map<String, Object>> cases = caseQueries.findCasesForLc(lcUsername, district);

            return ResponseEntity.ok(Map.of("success", true, "cases", CaseRows.open(cases)));
    }

    @PutMapping("/{caseId}/accept/lc")
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
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

            int updated = caseQueries.acceptByLc(caseId, lcId);

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
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
    public ResponseEntity<?> createCase(@RequestBody CreateCaseRequest caseData,
                                        HttpServletRequest request) {
        return caseCreationService.createCase(caseData, request);
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
            response.put("jurisdiction",
                    JurisdictionRouting.assess(result.suggestedCaseType, description).toMap());
            return ResponseEntity.ok(response);
    }


    @PutMapping("/{caseId}/accept/lawyer")
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
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

            int updated = caseQueries.acceptByLawyer(caseId, lawyerId);

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
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
    public ResponseEntity<?> resolveCase(@PathVariable String caseId,
                                         @Valid @RequestBody CaseActionRequest request) {
            String resolvedBy = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseId, resolvedBy);
            if (denied != null) return denied;
            String resolvedByRole = authenticatedRole();

            int updated = caseQueries.resolve(caseId, resolvedByRole);

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

            int updated = caseQueries.saveLegalAdvice(caseId, adviceText, providedBy);

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

    @DeleteMapping("/{caseId}")
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
    public ResponseEntity<?> deleteCase(@PathVariable String caseId) {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators may delete cases"));
            }
            java.util.Set<String> caseFiles = fileCleanup == null
                    ? java.util.Set.of() : fileCleanup.caseFiles(caseId);
            int deleted = caseQueries.delete(caseId);

            if (deleted == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }
            if (fileCleanup != null) {
                try {
                    fileCleanup.purgeCaseDependents(caseId, caseFiles);
                } catch (RuntimeException e) {
                    // The case itself is gone; leftover rows/files are only wasted space, so do not fail the request.
                    logger.warn("Case {} deleted but its files/related rows could not be fully removed: {}",
                            caseId, e.getMessage());
                }
            }

            auditLogService.logAction(
                    actor, authenticatedRole(), "CASE_DELETED", "case", caseId,
                    "Case deleted by administrator"
            );

            return ResponseEntity.ok(Map.of("success", true, "message", "Case deleted successfully"));
    }

    @PutMapping("/{caseId}/assign")
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
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

            if (!caseQueries.caseExists(caseId)) {
                response.put("success", false);
                response.put("message", "Case not found: " + caseId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            int rows = caseQueries.assignHandler(caseId, currentHandler, handlerRole,
                    messagingEnabled, messagingLocked);

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
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
    public ResponseEntity<?> updateCase(
            @PathVariable String caseId,
            @Valid @RequestBody CaseUpdateRequest request) {
        return caseUpdateService.updateCase(caseId, request);
    }

    @GetMapping("/open")
    public ResponseEntity<?> getOpenCases() {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Administrator access required"));
            }
            List<Map<String, Object>> cases = caseQueries.findOpenCases();
            return ResponseEntity.ok(Map.of("success", true, "cases", CaseRows.open(cases)));
    }

    @GetMapping("/stats/open")
    public ResponseEntity<?> countOpenCases() {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Administrator access required"));
            }
            Long count = caseQueries.countOpenCases();
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
            List<Map<String, Object>> cases = caseQueries.findCasesByHandler(officerId);
            return ResponseEntity.ok(Map.of("success", true, "cases", CaseRows.open(cases)));
    }

    @PutMapping("/{caseNumber}/status")
    @Caching(evict = {
            @CacheEvict(value = "statistics", key = "'cases'"),
            @CacheEvict(value = "statistics", key = "'admin-verification'")
    })
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
            auditAdminCaseView(actor, caseNumber, "history");
            Case caseEntity = caseService.getCaseByNumber(caseNumber);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "caseNumber", caseNumber,
                    "currentStatus", caseEntity.getCaseStatus(),
                    "history", caseEntity.getStatusHistory()
            ));
    }
}
