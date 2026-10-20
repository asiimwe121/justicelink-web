package lcdjp.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUsernameOrderByTimestampDesc(String username);

    List<Notification> findByUsernameAndReadFalseOrderByTimestampDesc(String username);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.username = ?1 AND n.read = false")
    Long countUnreadByUsername(String username);

    List<Notification> findByUsernameAndTypeOrderByTimestampDesc(String username, String type);
}