package lcdjp;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CaseStatusUpdateRequest {
    private String caseNumber;

    @NotNull(message = "newStatus is required")
    private CaseStatus newStatus;

    private String comment;
    private String updatedBy;
    private String updatedByRole;
}
