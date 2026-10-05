package lcdjp;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CaseService {

    private final CaseRepository caseRepository;
    private final NotificationService notificationService;

    @Transactional
    public Case createCase(Case newCase) {
        if (newCase.getCaseNumber() == null || newCase.getCaseNumber().isEmpty()) {
            newCase.setCaseNumber("CASE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        newCase.setCaseStatus(CaseStatus.PENDING);
        return caseRepository.save(newCase);
    }

    public List<Case> getOpenCases() {
        return caseRepository.findOpenCases();
    }

    public Long countOpenCases() {
        return caseRepository.countOpenCases();
    }

    public List<Case> getCasesByCitizen(String citizenId) {
        return caseRepository.findByCitizenIdOrderByCreatedAtDesc(citizenId);
    }

    public Case getCaseByNumber(String caseNumber) {
        return caseRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found: " + caseNumber));
    }
    @Transactional
    public Case updateStatus(Long caseId, String status) {
        Case caseEntity = caseRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found with id: " + caseId));

        CaseStatus newStatus = CaseStatus.valueOf(status.toUpperCase());
        caseEntity.setCaseStatus(newStatus);

        if (newStatus == CaseStatus.CLOSED || newStatus == CaseStatus.RESOLVED) {
            caseEntity.setResolvedAt(LocalDateTime.now());
        }

        return caseRepository.save(caseEntity);
    }

    public List<Case> getCasesByOfficer(Long officerId) {
        return caseRepository.findByAssignedTo(String.valueOf(officerId));
    }

    @Transactional
    public Case updateCaseStatus(String caseNumber, CaseStatus newStatus, String comment, String updatedBy, String updatedByRole) {
        Case caseEntity = caseRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found: " + caseNumber));

        CaseStatus oldStatus = caseEntity.getCaseStatus();
        caseEntity.setCaseStatus(newStatus);

        String historyEntry = String.format("%s: Status changed from %s to %s by %s (%s)%s",
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                oldStatus, newStatus, updatedBy, updatedByRole,
                comment != null ? " - " + comment : "");

        if (caseEntity.getStatusHistory() == null) {
            caseEntity.setStatusHistory(historyEntry);
        } else {
            caseEntity.setStatusHistory(caseEntity.getStatusHistory() + "\n" + historyEntry);
        }

        if (newStatus == CaseStatus.RESOLVED || newStatus == CaseStatus.CLOSED) {
            caseEntity.setResolvedAt(LocalDateTime.now());
        }

        caseEntity.setUpdatedAt(LocalDateTime.now());

        notificationService.notifyCaseStatusUpdate(
                caseEntity.getCitizenId(),
                caseNumber,
                newStatus.toString(),
                updatedBy
        );

        return caseRepository.save(caseEntity);
    }
}