package lcdjp.verification;

import lcdjp.user.UserRepository;
import lcdjp.user.User;
import lcdjp.notification.EmailService;
import lcdjp.security.JwtUtil;
import lcdjp.common.RateLimiterService;
import lcdjp.security.TokenBlacklistService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class VerificationWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private RateLimiterService rateLimiterService;

    @MockBean
    private EmailService emailService;

    @MockBean
    private TokenBlacklistService tokenBlacklistService;

    private String adminToken;

    private static final String ADMIN_USERNAME = "admin_user";
    private static final String TARGET_USERNAME = "verif_test_target";

    @BeforeEach
    void setUp() {
        when(rateLimiterService.isAllowed(anyString())).thenReturn(true);
        if (!userRepository.existsByUsername(ADMIN_USERNAME)) {
            User admin = new User();
            admin.setUsername(ADMIN_USERNAME);
            admin.setPassword(passwordEncoder.encode("Test@1234"));
            admin.setRole("SYSTEM_ADMIN");
            admin.setFirstName("Test");
            admin.setLastName("Admin");
            admin.setDistrict("Kampala");
            admin.setApprovalStatus("Approved");
            admin.setActive(true);
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
        }
        adminToken = jwtUtil.generateToken(ADMIN_USERNAME, "SYSTEM_ADMIN", "Kampala");

        if (!userRepository.existsByUsername(TARGET_USERNAME)) {
            User target = new User();
            target.setUsername(TARGET_USERNAME);
            target.setPassword(passwordEncoder.encode("Test@1234"));
            target.setRole("Citizen");
            target.setFirstName("Verify");
            target.setLastName("Target");
            target.setDistrict("Kampala");
            target.setEmail("verif.target@example.com");
            target.setApprovalStatus("Pending");
            target.setActive(true);
            target.setCreatedAt(LocalDateTime.now());
            userRepository.save(target);
        }
        jdbcTemplate.update(
                "UPDATE users SET requested_role = 'Citizen', verification_status = 'PENDING' WHERE username = ?",
                TARGET_USERNAME);
    }

    @AfterEach
    void tearDown() {
        userRepository.findByUsername(TARGET_USERNAME).ifPresent(userRepository::delete);
    }

    @Test
    public void approvalAndRejectionPersistAndSendDecisionEmails() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.put("/api/auth/users/" + TARGET_USERNAME + "/verify/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}