package lcdjp;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "cases")
@Data
public class Case {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "case_id")
    private Long id;

    @Column(name = "case_reference", unique = true)
    private String caseReference;

    @Column(name = "case_number")
    private String caseNumber;

    @Column(nullable = false)
    private String caseType;

    private String title;
    private String description;

    @Column(name = "citizen_name")
    private String citizenName;

    @Column(name = "citizen_phone")
    private String citizenPhone;

    @Column(name = "citizen_email")
    private String citizenEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "case_status")
    private CaseStatus caseStatus = CaseStatus.PENDING;

    @Column(name = "current_level")
    private String currentLevel;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "assigned_role")
    private String assignedRole;

    private String district;

    @Column(name = "sub_county")
    private String subCounty;

    private String parish;
    private String village;

    @Column(name = "full_location")
    private String fullLocation;

    @Column(name = "citizen_id")
    private String citizenId;

    @Column(name = "assigned_lawyer")
    private String assignedLawyer;

    @Column(name = "assigned_lc")
    private String assignedLC;

    @Column(name = "assigned_org")
    private String assignedOrg;

    @Column(name = "legal_advice")
    private String legalAdvice;

    @Column(name = "legal_advice_provided_by")
    private String legalAdviceProvidedBy;

    @Column(name = "legal_advice_date")
    private LocalDateTime legalAdviceDate;

    @Column(columnDefinition = "TEXT")
    private String timeline;

    @Column(name = "status_history", columnDefinition = "TEXT")
    private String statusHistory;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (caseReference == null || caseReference.isEmpty()) {
            caseReference = "CASE-" + System.currentTimeMillis();
        }
        if (caseNumber == null || caseNumber.isEmpty()) {
            caseNumber = caseReference;
        }
        if (caseStatus == null) {
            caseStatus = CaseStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}