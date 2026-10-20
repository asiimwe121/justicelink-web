package lcdjp.cases;

import lcdjp.security.FieldCrypto;
import lcdjp.storage.FileRefService;
import lcdjp.storage.VoiceStorageService;
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
import org.springframework.stereotype.Service;

/**
 * Files a new case: ownership and draft de-duplication checks, classification when the citizen gave
 * no category, sealing of sensitive narratives, the insert, jurisdiction routing and the citizen's
 * confirmation notification. Split out of {@link CaseController} so the controller only maps HTTP.
 */
@Service
public class CaseCreationService extends CaseApiSupport {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseCreationService.class);

    @Autowired
    private VoiceStorageService voiceStorageService;

    @Autowired
    private FileRefService fileRefService;

    @Autowired
    private CaseClassificationService caseClassificationService;

    @Autowired
    private CaseOfferService caseOfferService;

    @Autowired
    private CaseQueryRepository caseQueries;

    public ResponseEntity<?> createCase(CreateCaseRequest caseData,
                                        HttpServletRequest request) {
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
            String clientDraftId = caseData.getClientDraftId();
            if (clientDraftId != null && !clientDraftId.isBlank()) {
                clientDraftId = clientDraftId.trim();
                if (!clientDraftId.matches("[A-Za-z0-9_-]{8,64}")) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Invalid clientDraftId"));
                }
                Map<String, Object> existing = findCaseByClientDraftId(citizenId, clientDraftId);
                if (existing != null) {
                    return ResponseEntity.ok(duplicateDraftResponse(existing));
                }
            } else {
                clientDraftId = null;
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

            // Violence and child-protection reports are stored encrypted from the first write, so the
            // narrative is never in the table (or its backups) as readable text.
            String trackForStorage = JurisdictionRouting.assess(caseType, description).track.name();
            String storedDescription = CaseRows.seal(trackForStorage, description);
            String storedExtraNotes = CaseRows.seal(trackForStorage, extraNotes);


            String newVoiceRef = null;
            if (voiceStatement != null && !voiceStatement.isBlank()) {
                try {
                    String original = voiceStatement;
                    voiceStatement = voiceStorageService.storeIfAudioDataUri(
                            voiceStatement, "CASE_STATEMENT", actor, null, caseReference);
                    if (!original.equals(voiceStatement)) {
                        newVoiceRef = voiceStatement; // blob created by this request
                    }
                } catch (IllegalArgumentException bad) {
                    return ResponseEntity.badRequest().body(Map.of("error", bad.getMessage()));
                }
            }

            // Attachments and the video statement go to object storage when it is configured (see FileRefService).
            attachedFileData = fileRefService.isFileUrl(attachedFileData) ? null : fileRefService.externalizeIfDataUri(attachedFileData, "cases");
            videoStatement = fileRefService.isFileUrl(videoStatement) ? null : fileRefService.externalizeIfDataUri(videoStatement, "cases");

            try {
            caseQueries.insertCase(
                    caseReference, caseType, citizenId, storedDescription,
                    district, subCounty, parish, village,
                    status, currentLevel,
                    citizenPhone, citizenEmail,
                    kinName, kinPhone, kinEmail, kinRelationship,
                    fullLocation,
                    attachedMedia, attachedFileData, attachedFileSize, attachedFileType,
                    hasVoiceStatement, voiceStatement, voiceDuration,
                    hasVideoStatement, videoStatement, videoDuration,
                    storedExtraNotes, clientDraftId
            );
            } catch (org.springframework.dao.DuplicateKeyException dup) {
                voiceStorageService.discard(newVoiceRef);
                fileRefService.deleteQuietly(attachedFileData);
                fileRefService.deleteQuietly(videoStatement);
                // Two syncs of the same offline draft raced; return the case the first one created.
                Map<String, Object> existing = clientDraftId == null ? null
                        : findCaseByClientDraftId(citizenId, clientDraftId);
                if (existing != null) {
                    return ResponseEntity.ok(duplicateDraftResponse(existing));
                }
                throw dup;
            } catch (RuntimeException failed) {
                voiceStorageService.discard(newVoiceRef);
                fileRefService.deleteQuietly(attachedFileData);
                fileRefService.deleteQuietly(videoStatement);
                throw failed;
            }

            logger.info("✅ Case created with reference: " + caseReference);

            if ((lcLocationChoice != null && !lcLocationChoice.isEmpty())
                    || (lcLocationSource != null && !lcLocationSource.isEmpty())) {
                caseQueries.setLcLocation(caseReference, lcLocationChoice, lcLocationSource);
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

            JurisdictionRouting.Assessment jurisdiction = JurisdictionRouting.assess(caseType, description);
            caseQueries.setJurisdiction(caseReference, jurisdiction.track.name(), jurisdiction.isUrgent());
            String detailsJson = CaseDetails.sanitizeToJson(jurisdiction.track, caseData.getCaseDetails());
            if (detailsJson != null) {
                caseQueries.setEncryptedDetails(caseReference, FieldCrypto.encrypt(detailsJson));
            }
            if (jurisdiction.track == JurisdictionRouting.Track.DETENTION) {
                caseOfferService.alertLawyersOfDetention(caseReference, district);
            }
            if (jurisdiction.isUrgent()) {
                auditLogService.logAction(citizenId, "Citizen", "CASE_URGENT_FLAGGED", "case", caseReference,
                        "Jurisdiction track: " + jurisdiction.track.name()
                                + "; matched: " + String.join(",", jurisdiction.matchedGroups));
            }

            String assignedTo = null;
            String assignedType = null;
            String routingMessage = "Case submitted successfully.";

            if ("legal_aid".equalsIgnoreCase(routingChoice)) {
                caseQueries.routeToLegalAid(caseReference);
                CaseOfferService.LawyerOffer offer = caseOfferService.offerCaseToNextLawyer(caseReference, district, subCounty, parish, caseType, null);
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

                caseQueries.markInfoOnly(caseReference, routingChoice.toLowerCase());
                routingMessage = jurisdiction.isLcEligible() || jurisdiction.advisory.isEmpty()
                        ? "Your report has been recorded for your records."
                        : jurisdiction.advisory;
            } else {

                caseQueries.markAwaitingRoutingChoice(caseReference);
                routingMessage = "Case submitted. Awaiting routing choice.";
            }

            createCitizenNotification(citizenId, caseReference, routingMessage);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", routingMessage != null ? routingMessage : "Case submitted successfully");
            response.put("caseReference", caseReference != null ? caseReference : "");
            response.put("assignedTo", assignedTo != null ? assignedTo : "");
            response.put("assignedType", assignedType != null ? assignedType : "");
            response.put("jurisdiction", jurisdiction.toMap());

            return ResponseEntity.ok(response);
    }

    private Map<String, Object> findCaseByClientDraftId(String citizenId, String clientDraftId) {
        return caseQueries.findCaseByClientDraftId(citizenId, clientDraftId);
    }

    private Map<String, Object> duplicateDraftResponse(Map<String, Object> existing) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("duplicate", true);
        response.put("message", "This case was already submitted.");
        response.put("caseReference", String.valueOf(existing.get("case_reference")));
        response.put("assignedTo", "");
        response.put("assignedType", "");
        return response;
    }

    private String generateCaseReference() {
        String datePart = LocalDate.now().toString().replace("-", "");
        int nextNumber = caseQueries.countCasesCreatedToday() + 1;
        int randomSuffix = (int) (Math.random() * 9000) + 1000;
        return String.format("LCDJP-%s-%04d-%d", datePart, nextNumber, randomSuffix);
    }
}
