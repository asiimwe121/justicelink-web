package lcdjp.cases;

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
 * Applies a partial update to a case: referrals, status changes, handler changes, voice statements
 * and the audit trail. Split out of {@link CaseController} so the controller only maps HTTP.
 */
@Service
public class CaseUpdateService extends CaseApiSupport {

    @Autowired
    private VoiceStorageService voiceStorageService;

    @Autowired
    private FileRefService fileRefService;

    @Autowired
    private CaseQueryRepository caseQueries;

    public ResponseEntity<?> updateCase(
            String caseId,
            CaseUpdateRequest request) {

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
                Object notesValue = request.get("extraNotes");
                params.add(notesValue == null ? null : CaseRows.seal(
                        existingCase.get("jurisdiction_track") == null ? null
                                : existingCase.get("jurisdiction_track").toString(),
                        notesValue.toString()));
                first = false;
            }
            if (request.containsKey("attachedMedia")) {
                if (!first) sql.append(", ");
                sql.append("attached_media = ?");
                params.add(request.get("attachedMedia"));
                first = false;
            }
            // A download URL echoed back by the browser means "unchanged": never store it as the file.
            Object newAttachment = request.get("attachedFileData");
            boolean attachmentIsEcho = newAttachment instanceof String s && fileRefService.isFileUrl(s);
            if (request.containsKey("attachedFileData") && !attachmentIsEcho) {
                if (!first) sql.append(", ");
                sql.append("attached_file_data = ?");
                params.add(newAttachment instanceof String s2
                        ? fileRefService.externalizeIfDataUri(s2, "cases") : newAttachment);
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
                Object voiceNote = request.get("voiceNoteData");
                if (voiceNote instanceof String voiceNoteText && !voiceNoteText.isBlank()) {
                    try {
                        voiceNote = voiceStorageService.storeIfAudioDataUri(voiceNoteText, "CASE_NOTE", actor, null,
                                strVal(existingCase.get("case_reference")));
                    } catch (IllegalArgumentException bad) {
                        return ResponseEntity.badRequest().body(Map.of("error", bad.getMessage()));
                    }
                }
                params.add(voiceNote);
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

            int rows = caseQueries.updateColumns(sql.toString(), params);
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
}
