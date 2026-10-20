package lcdjp.cases;

import lombok.Data;

@Data
public class CreateCaseRequest {

    private String caseReference;
    private String caseType;
    private String citizenId;
    private String description;

    private String district;
    private String subCounty;
    private String parish;
    private String village;
    private String status;
    private String currentLevel;

    private String citizenPhone;
    private String citizenEmail;
    private String kinName;
    private String kinPhone;
    private String kinEmail;
    private String kinRelationship;
    private String fullLocation;

    private String attachedMedia;
    private String attachedFileData;
    private Long attachedFileSize;
    private String attachedFileType;

    private Boolean hasVoiceStatement;
    private String voiceStatement;
    private Integer voiceDuration;

    private Boolean hasVideoStatement;
    private String videoStatement;
    private Integer videoDuration;

    private String extraNotes;
    private String routingChoice;
    private String lcLocationChoice;
    private String lcLocationSource;

    /** Client-generated id for a case drafted offline; makes sync retries idempotent. */
    private String clientDraftId;

    /** Extra fields for land and detention reports; only whitelisted keys are stored (see CaseDetails). */
    private java.util.Map<String, Object> caseDetails;
}
