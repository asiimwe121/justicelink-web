package lcdjp;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    int RECENT_ACTIVITY_CAP = 500;

    @Query("SELECT a FROM ActivityLog a ORDER BY a.createdAt DESC")
    List<ActivityLog> findRecentActivitiesUnbounded(org.springframework.data.domain.Pageable pageable);

    default List<ActivityLog> findRecentActivities() {
        return findRecentActivitiesUnbounded(org.springframework.data.domain.PageRequest.of(0, RECENT_ACTIVITY_CAP));
    }

    @Query(value = "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5", nativeQuery = true)
    List<ActivityLog> findLastFiveActivities();

    List<ActivityLog> findTop500ByUsernameOrderByCreatedAtDesc(String username);

    List<ActivityLog> findTop500ByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);

    List<ActivityLog> findTop500ByActionOrderByCreatedAtDesc(String action);

    List<ActivityLog> findTop500ByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);

    long countByCreatedAtAfter(LocalDateTime date);

    @Query("SELECT a.action, COUNT(a) FROM ActivityLog a GROUP BY a.action ORDER BY COUNT(a) DESC")
    List<Object[]> countActionsByType();

    @Query("SELECT a.activityType, COUNT(a) FROM ActivityLog a GROUP BY a.activityType ORDER BY COUNT(a) DESC")
    List<Object[]> countActivityTypes();

    @Query("SELECT COUNT(a) FROM ActivityLog a WHERE a.username = :username")
    long countByUsername(@Param("username") String username);

    @Modifying
    @Transactional
    @Query("DELETE FROM ActivityLog a WHERE a.createdAt < :date")
    int deleteByCreatedAtBefore(@Param("date") LocalDateTime date);

    @Modifying
    @Transactional
    @Query("DELETE FROM ActivityLog a WHERE a.username = :username")
    int deleteByUsername(@Param("username") String username);
}