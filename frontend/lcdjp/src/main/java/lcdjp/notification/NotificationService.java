package lcdjp.notification;

import lcdjp.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification createNotification(String username, String message, String type,
                                           String sender, String senderName, String senderRole) {
        return createNotification(username, message, type, sender, senderName, senderRole, null);
    }

    @Transactional
    public Notification createNotification(String username, String message, String type,
                                           String sender, String senderName, String senderRole,
                                           String caseReference) {
        Notification notification = new Notification();
        notification.setUsername(username);
        notification.setMessage(message);
        notification.setType(type);
        notification.setSender(sender);
        notification.setSenderName(senderName);
        notification.setSenderRole(senderRole);
        notification.setCaseReference(caseReference);
        notification.setRead(false);

        return notificationRepository.save(notification);
    }

    public List<Notification> getNotificationsByUser(String username) {
        return notificationRepository.findByUsernameOrderByTimestampDesc(username);
    }

    public List<Notification> getUnreadNotifications(String username) {
        return notificationRepository.findByUsernameAndReadFalseOrderByTimestampDesc(username);
    }

    public Long getUnreadCount(String username) {
        return notificationRepository.countUnreadByUsername(username);
    }

    @Transactional
    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String username) {
        List<Notification> unread = notificationRepository.findByUsernameAndReadFalseOrderByTimestampDesc(username);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void deleteNotification(Long notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    @Transactional
    public void deleteAllByUser(String username) {
        notificationRepository.deleteAll(
                notificationRepository.findByUsernameOrderByTimestampDesc(username)
        );
    }

    public void notifyCaseStatusUpdate(String username, String caseNumber, String newStatus, String updatedBy) {
        String message = String.format("Your case %s has been updated to: %s by %s",
                caseNumber, newStatus, updatedBy);
        createNotification(username, message, "CASE_UPDATE", "system", "LCDJP System", "Admin", caseNumber);
    }

    public void notifyCaseAssigned(String username, String caseNumber, String assignedTo, String role) {
        String message = String.format("Your case %s has been assigned to %s (%s)",
                caseNumber, assignedTo, role);
        createNotification(username, message, "CASE_ASSIGNED", "system", "LCDJP System", "Admin", caseNumber);
    }

    public void notifyEmergencyResponse(String username, String emergencyType, String officerName) {
        String message = String.format("🚨 Emergency %s is being handled by %s",
                emergencyType, officerName);
        createNotification(username, message, "EMERGENCY", "system", "LCDJP System", "Dispatch");
    }
}