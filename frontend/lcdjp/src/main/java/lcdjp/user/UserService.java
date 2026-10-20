package lcdjp.user;

import lcdjp.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public User registerUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    public User findAuthEssentialsByUsername(String username) {
        return userRepository.findAuthEssentialsByUsername(username).orElse(null);
    }

    public boolean validatePassword(String rawPassword, String encodedPassword) {
        if (encodedPassword != null &&
                (encodedPassword.startsWith("$2a$") || encodedPassword.startsWith("$2b$") || encodedPassword.startsWith("$2y$"))) {
            return passwordEncoder.matches(rawPassword, encodedPassword);
        }

        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        return java.security.MessageDigest.isEqual(
                rawPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                encodedPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Transactional
    public void updatePassword(String username, String oldPassword, String newPassword) {
        User user = findByUsername(username);

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public User findByPhone(String phone) {
        return userRepository.findByPhone(phone)
                .orElseThrow(() -> new ResourceNotFoundException("Phone number not registered: " + phone));
    }

    @Transactional
    public void resetPasswordByPhone(String phone, String newPassword) {
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ResourceNotFoundException("Phone number not registered: " + phone));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public User updateProfile(String username, ProfileUpdateRequest request) {
        User user = findByUsername(username);

        if (request.getFirstName() != null && !request.getFirstName().isEmpty()) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null && !request.getLastName().isEmpty()) {
            user.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {

            userRepository.findByEmail(request.getEmail())
                    .ifPresent(existingUser -> {
                        if (!existingUser.getUsername().equals(username)) {
                            throw new RuntimeException("Email already in use");
                        }
                    });
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            user.setPhone(request.getPhone());
        }
        if (request.getDistrict() != null && !request.getDistrict().isEmpty()) {
            user.setDistrict(request.getDistrict());
        }
        if (request.getSubCounty() != null && !request.getSubCounty().isEmpty()) {
            user.setSubCounty(request.getSubCounty());
        }
        if (request.getParish() != null && !request.getParish().isEmpty()) {
            user.setParish(request.getParish());
        }
        if (request.getVillage() != null && !request.getVillage().isEmpty()) {
            user.setVillage(request.getVillage());
        }
        if (request.getNationalId() != null && !request.getNationalId().isEmpty()) {
            user.setNationalId(request.getNationalId());
        }
        if (request.getGender() != null && !request.getGender().isEmpty()) {
            user.setGender(request.getGender());
        }
        if (request.getDateOfBirth() != null && !request.getDateOfBirth().isEmpty()) {
            user.setDateOfBirth(request.getDateOfBirth());
        }

        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public User getProfile(String username) {
        return findByUsername(username);
    }
}