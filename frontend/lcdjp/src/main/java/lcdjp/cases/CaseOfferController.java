package lcdjp.cases;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.List;
import java.time.LocalDateTime;

/** AI routing and lawyer offers: route a case, accept or decline an offer, offer to a chosen lawyer, legal-aid status. */
@RestController
@RequestMapping("/api/cases")
public class CaseOfferController extends CaseApiSupport {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseOfferController.class);
    private static final int LEGAL_AID_RESUME_EXPIRY_DAYS = 14;

    @Autowired
    private CaseOfferService caseOfferService;

    @Autowired
    private CaseOfferRepository caseOffers;

    @Autowired
    private CaseNotificationRepository caseNotifications;

    @Autowired
    private CoverageGapService coverageGapService;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

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
            caseOffers.setRoutingChoice(caseId, choice.toLowerCase());

            if ("legal_aid".equalsIgnoreCase(choice)) {
                CaseOfferService.LawyerOffer offer = caseOfferService.offerCaseToNextLawyer(
                        caseId, strVal(current.get("district")), strVal(current.get("sub_county")),
                        strVal(current.get("parish")), strVal(current.get("case_type")), null);
                if (offer == null) {
                    return ResponseEntity.ok(Map.of("success", true, "matched", false,
                            "message", "No lawyer available — please see suggested legal aid organisations."));
                }
                return ResponseEntity.ok(Map.of("success", true, "matched", true, "offeredTo", offer.username));
            }

            caseOffers.markInfoOnly(caseId);
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
            int updated = caseOffers.acceptOffer(caseId, lawyerId);
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
            caseOffers.declineOffer(caseId, updatedCsv);

            String citizenId = strVal(current.get("citizen_id"));
            if (citizenId != null && !citizenId.isBlank()) {
                caseNotifications.aiCaseDeclined(citizenId,
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
            if (!caseOffers.approvedLawyerExists(lawyerUsername)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Lawyer not found"));
            }

            caseOffers.offerToLawyer(caseId, lawyerUsername);
            caseOfferService.notifyLawyerOfAiOffer(lawyerUsername, caseId);
            auditLogService.logAction(actor, "Citizen", "AI_CASE_OFFERED_TO_LAWYER", "case", caseId,
                    "Citizen selected lawyer " + lawyerUsername + " for case " + caseId);

            return ResponseEntity.ok(Map.of("success", true, "offeredTo", lawyerUsername));
    }

    /** The citizen picks a registered LC for their case. The LC still has to accept it. */
    @PutMapping("/{caseId}/offer-to-lc/{lcUsername}")
    public ResponseEntity<?> offerCaseToSpecificLc(@PathVariable String caseId, @PathVariable String lcUsername) {
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
                        .body(Map.of("error", "Only the citizen who filed this case may choose an LC"));
            }
            if (!strVal(current.get("assigned_lc")).isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "An LC has already accepted this case"));
            }
            String track = strVal(current.get("jurisdiction_track"));
            if (!track.isEmpty()) {
                boolean lcEligible;
                try { lcEligible = JurisdictionRouting.Track.valueOf(track).isLcEligible(); }
                catch (IllegalArgumentException unknown) { lcEligible = true; }
                if (!lcEligible) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("error", "This kind of report is not handled by Local Councils"));
                }
            }
            java.util.Optional<Map<String, Object>> lcProfile = caseOffers.findApprovedLcProfile(lcUsername);
            if (lcProfile.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "LC official not found"));
            }
            // Each village/parish/sub-county has its own LC: the whole area chain has to match, not just the district.
            Map<String, String> caseArea = new java.util.HashMap<>();
            caseArea.put("village", strVal(current.get("village")));
            caseArea.put("parish", strVal(current.get("parish")));
            caseArea.put("subCounty", strVal(current.get("sub_county")));
            caseArea.put("district", strVal(current.get("district")));
            String lcLevel = LcJurisdiction.levelOfUserRow(lcProfile.get());
            if (lcLevel == null || !LcJurisdiction.DISPUTE_LEVELS.contains(lcLevel)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "This LC office does not handle citizen reports"));
            }
            if (!LcJurisdiction.covers(lcProfile.get(), lcLevel, caseArea)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "This LC does not serve the area of your case"));
            }

            caseOffers.offerToLc(caseId, lcUsername);
            try {
                jdbcTemplate.update(
                        "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) "
                                + "VALUES (?, ?, 'lc_case_offer', ?, FALSE, NOW())",
                        lcUsername, "A citizen has asked your office to handle case " + caseId + ". Please review and accept it.",
                        caseId);
            } catch (Exception e) {
                logger.error("Could not notify LC {} of case {}: {}", lcUsername, caseId, e.getMessage());
            }
            auditLogService.logAction(actor, "Citizen", "CASE_OFFERED_TO_LC", "case", caseId,
                    "Citizen selected LC " + lcUsername + " for case " + caseId);
            return ResponseEntity.ok(Map.of("success", true, "offeredTo", lcUsername));
    }

    /** Called when no registered LC exists at the needed level, so admins can register or suggest one. */
    @PostMapping("/{caseId}/coverage-gap")
    public ResponseEntity<?> reportCoverageGap(@PathVariable String caseId, @RequestBody CoverageGapRequest body) {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> current = singleCase(caseId);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Case not found"));
            }
            if (!actor.equals(strVal(current.get("citizen_id"))) && !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only the citizen who filed this case may report this"));
            }
            String level = body == null || body.getLevel() == null ? "" : body.getLevel().trim().toUpperCase();
            if (!level.equals("LC1") && !level.equals("LC2") && !level.equals("LC3")) {
                return ResponseEntity.badRequest().body(Map.of("error", "level must be LC1, LC2 or LC3"));
            }
            String area = switch (level) {
                case "LC1" -> joinNonBlank(current.get("village"), current.get("parish"), current.get("sub_county"));
                case "LC2" -> joinNonBlank(current.get("parish"), current.get("sub_county"));
                default -> joinNonBlank(current.get("sub_county"));
            };
            int notified = coverageGapService.report(caseId, strVal(current.get("district")), level, area);
            auditLogService.logAction(actor, "Citizen", "CASE_COVERAGE_GAP", "case", caseId,
                    "No registered " + level + " office for the case area; admins notified: " + notified);
            return ResponseEntity.ok(Map.of("success", true, "adminsNotified", notified));
    }

    private static String joinNonBlank(Object... parts) {
        StringBuilder sb = new StringBuilder();
        for (Object p : parts) {
            if (p == null || p.toString().isBlank()) continue;
            if (sb.length() > 0) sb.append(", ");
            sb.append(p.toString().trim());
        }
        return sb.toString();
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
            List<Map<String, Object>> rows = caseOffers.findResumableLegalAidCase(citizenId, expiryCutoff, caseType);
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
            List<Map<String, Object>> offers = caseOffers.findPendingOffersForLawyer(username);
            return ResponseEntity.ok(Map.of("success", true, "offers", offers));
    }
}
