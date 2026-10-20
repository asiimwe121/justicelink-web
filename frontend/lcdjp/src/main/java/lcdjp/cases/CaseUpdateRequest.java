package lcdjp.cases;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.LinkedHashSet;
import java.util.Set;

@Data
public class CaseUpdateRequest {
    @Size(max = 100) private String status;
    private String currentHandler;
    @JsonAlias("current_handler") private String currentHandlerAlias;
    private String handlerRole;
    @JsonAlias("handler_role") private String handlerRoleAlias;
    private Boolean messagingEnabled;
    @JsonAlias("messaging_enabled") private Boolean messagingEnabledAlias;
    private Boolean messagingLocked;
    @JsonAlias("messaging_locked") private Boolean messagingLockedAlias;
    @Size(max = 10_000) private String legalAdvice;
    @Size(max = 20_000) private String timeline;
    @Size(max = 20_000) private String extraNotes;
    private String attachedMedia;
    @Size(max = 7_000_000) private String attachedFileData;
    @PositiveOrZero private Long attachedFileSize;
    private String attachedFileType;
    @Size(max = 20_000_000) private String voiceNoteData;
    @PositiveOrZero private Integer voiceNoteDuration;
    @JsonAlias("assigned_lawyer") private String assignedLawyer;
    @JsonAlias("resolved_by") private String resolvedBy;
    @JsonAlias("resolution_details") private String resolutionDetails;
    @JsonAlias("current_level") private String currentLevel;
    @JsonAlias("routing_status") private String routingStatus;
    @JsonAlias("lc_comments") private String lcComments;
    @JsonAlias("lc_statements") private String lcStatements;
    @JsonAlias("lc_evidence_file") private String lcEvidenceFile;
    @JsonAlias("selected_lawyer") private String selectedLawyer;
    @JsonAlias("selected_lawyer_status") private String selectedLawyerStatus;
    @JsonAlias("assigned_specialization") private String assignedSpecialization;
    @JsonAlias("selected_lawyer_name") private String selectedLawyerName;
    @JsonAlias("selected_lawyer_specialization") private String selectedLawyerSpecialization;
    @JsonAlias("accepted_date") private String acceptedDate;
    @JsonAlias("assigned_lc") private String assignedLc;
    @JsonAlias("assigned_org") private String assignedOrg;
    @JsonAlias("available_lawyers") private String availableLawyers;
    @JsonAlias({"routing_choice"}) private String routingChoice;
    @JsonAlias({"lc_referral_notes"}) private String lcReferralNotes;
    @JsonAlias({"referred_to"}) private String referredTo;
    @JsonAlias({"referred_by"}) private String referredBy;
    @JsonAlias({"lc_location_choice"}) private String lcLocationChoice;
    @JsonAlias({"lc_location_source"}) private String lcLocationSource;
    public String effectiveCurrentHandler() { return currentHandler != null ? currentHandler : currentHandlerAlias; }
    public String effectiveHandlerRole() { return handlerRole != null ? handlerRole : handlerRoleAlias; }
    public Boolean effectiveMessagingEnabled() { return messagingEnabled != null ? messagingEnabled : messagingEnabledAlias; }
    public Boolean effectiveMessagingLocked() { return messagingLocked != null ? messagingLocked : messagingLockedAlias; }

    public boolean containsKey(String name) { return get(name) != null; }
    public Object getOrDefault(String name, Object fallback) {
        Object value = get(name);
        return value == null ? fallback : value;
    }
    public Set<String> keySet() {
        Set<String> keys = new LinkedHashSet<>();
        String[] names = {"status", "currentHandler", "current_handler", "handlerRole", "handler_role",
                "messagingEnabled", "messaging_enabled", "messagingLocked", "messaging_locked", "legalAdvice",
                "timeline", "extraNotes", "attachedMedia", "attachedFileData", "attachedFileSize",
                "attachedFileType", "voiceNoteData", "voiceNoteDuration", "assignedLawyer", "assigned_lawyer",
                "resolvedBy", "resolved_by", "resolutionDetails", "resolution_details", "current_level",
                "routing_status", "lc_comments", "lc_statements", "lc_evidence_file", "selected_lawyer",
                "selected_lawyer_status", "assigned_specialization", "selected_lawyer_name",
                "selected_lawyer_specialization", "accepted_date", "assigned_lawyer", "assigned_lc",
                "assigned_org", "available_lawyers", "routingChoice", "routing_choice", "lc_referral_notes",
                "lcReferralNotes", "referred_to", "referredTo", "referred_by", "referredBy",
                "lcLocationChoice", "lc_location_choice", "lcLocationSource", "lc_location_source"};
        for (String name : names) if (containsKey(name)) keys.add(name);
        return keys;
    }
    public Object get(String name) {
        return switch (name) {
            case "status" -> status;
            case "currentHandler", "current_handler" -> effectiveCurrentHandler();
            case "handlerRole", "handler_role" -> effectiveHandlerRole();
            case "messagingEnabled", "messaging_enabled" -> effectiveMessagingEnabled();
            case "messagingLocked", "messaging_locked" -> effectiveMessagingLocked();
            case "legalAdvice" -> legalAdvice;
            case "timeline" -> timeline;
            case "extraNotes" -> extraNotes;
            case "attachedMedia" -> attachedMedia;
            case "attachedFileData" -> attachedFileData;
            case "attachedFileSize" -> attachedFileSize;
            case "attachedFileType" -> attachedFileType;
            case "voiceNoteData" -> voiceNoteData;
            case "voiceNoteDuration" -> voiceNoteDuration;
            case "assignedLawyer", "assigned_lawyer" -> assignedLawyer;
            case "resolvedBy", "resolved_by" -> resolvedBy;
            case "resolutionDetails", "resolution_details" -> resolutionDetails;
            case "current_level" -> currentLevel;
            case "routing_status" -> routingStatus;
            case "lc_comments", "lcComments" -> lcComments;
            case "lc_statements" -> lcStatements;
            case "lc_evidence_file" -> lcEvidenceFile;
            case "selected_lawyer" -> selectedLawyer;
            case "selected_lawyer_status" -> selectedLawyerStatus;
            case "assigned_specialization" -> assignedSpecialization;
            case "selected_lawyer_name" -> selectedLawyerName;
            case "selected_lawyer_specialization" -> selectedLawyerSpecialization;
            case "accepted_date" -> acceptedDate;
            case "assigned_lc" -> assignedLc;
            case "assigned_org" -> assignedOrg;
            case "available_lawyers" -> availableLawyers;
            case "routingChoice", "routing_choice" -> routingChoice;
            case "lc_referral_notes", "lcReferralNotes" -> lcReferralNotes;
            case "referred_to", "referredTo" -> referredTo;
            case "referred_by", "referredBy" -> referredBy;
            case "lcLocationChoice", "lc_location_choice" -> lcLocationChoice;
            case "lcLocationSource", "lc_location_source" -> lcLocationSource;
            default -> null;
        };
    }
}
