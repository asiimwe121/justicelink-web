package lcdjp;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    @Query("SELECT new lcdjp.User(u.id, u.username, u.role, u.district, u.isActive, " +
            "u.verificationStatus, u.approvalStatus) " +
            "FROM User u WHERE u.username = :username")
    Optional<User> findAuthEssentialsByUsername(@Param("username") String username);

    boolean existsByUsername(String username);
    Optional<User> findByPhone(String phone);
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
            "LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(u.phone) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(u.nationalId) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(u.role) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(u.district) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchUsers(@Param("q") String q, Pageable pageable);
}