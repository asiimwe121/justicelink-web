package lcdjp.user;

import lcdjp.common.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder);
    }

    private User user(String username) {
        User user = new User();
        user.setUsername(username);
        return user;
    }

    @Test
    void validatePasswordAcceptsCorrectPasswordAgainstBcryptHash() {
        String hash = passwordEncoder.encode("correct-horse");
        assertTrue(userService.validatePassword("correct-horse", hash));
    }

    @Test
    void validatePasswordRejectsWrongPasswordAgainstBcryptHash() {
        String hash = passwordEncoder.encode("correct-horse");
        assertFalse(userService.validatePassword("wrong-password", hash));
    }

    @Test
    void validatePasswordRecognizesAllThreeBcryptPrefixes() {
        String realHash = passwordEncoder.encode("correct-horse");
        for (String prefix : new String[]{"$2a$", "$2b$", "$2y$"}) {
            String hash = prefix + realHash.substring(4);
            assertTrue(userService.validatePassword("correct-horse", hash),
                    "correct password must match under the " + prefix + " prefix");
            assertFalse(userService.validatePassword("wrong-password", hash),
                    "wrong password must not match under the " + prefix + " prefix");
        }
    }

    @Test
    void validatePasswordAcceptsMatchingPlaintext() {
        assertTrue(userService.validatePassword("legacyPass123", "legacyPass123"));
    }

    @Test
    void validatePasswordRejectsNonMatchingPlaintext() {
        assertFalse(userService.validatePassword("wrong", "legacyPass123"));
    }

    @Test
    void validatePasswordRejectsNullRawPasswordAgainstPlaintextHash() {
        assertFalse(userService.validatePassword(null, "legacyPass123"));
    }

    @Test
    void validatePasswordRejectsWhenStoredHashIsNull() {
        assertFalse(userService.validatePassword("anything", null));
    }

    @Test
    void validatePasswordRejectsWhenBothAreNull() {
        assertFalse(userService.validatePassword(null, null));
    }

    @Test
    void registerUserHashesPasswordAndSetsCreatedAt() {
        User newUser = user("newbie");
        newUser.setPassword("plaintext");
        when(userRepository.existsByUsername("newbie")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User saved = userService.registerUser(newUser);

        assertNotEquals("plaintext", saved.getPassword(), "password must be hashed before saving");
        assertTrue(passwordEncoder.matches("plaintext", saved.getPassword()));
        assertNotNull(saved.getCreatedAt());
    }

    @Test
    void registerUserRejectsDuplicateUsername() {
        when(userRepository.existsByUsername("taken")).thenReturn(true);
        User newUser = user("taken");

        assertThrows(RuntimeException.class, () -> userService.registerUser(newUser));
        verify(userRepository, never()).save(any());
    }

    @Test
    void findByUsernameReturnsUserWhenPresent() {
        User existing = user("alice");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(existing));

        assertSame(existing, userService.findByUsername("alice"));
    }

    @Test
    void findByUsernameThrowsResourceNotFoundWhenAbsent() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.findByUsername("ghost"));
    }

    @Test
    void findByPhoneThrowsResourceNotFoundWhenAbsent() {
        when(userRepository.findByPhone("0000000000")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.findByPhone("0000000000"));
    }

    @Test
    void updatePasswordSucceedsWithCorrectOldPassword() {
        User existing = user("bob");
        existing.setPassword(passwordEncoder.encode("oldPass"));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(existing));

        userService.updatePassword("bob", "oldPass", "newPass");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertTrue(passwordEncoder.matches("newPass", captor.getValue().getPassword()));
    }

    @Test
    void updatePasswordRejectsIncorrectOldPassword() {
        User existing = user("bob");
        existing.setPassword(passwordEncoder.encode("oldPass"));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(existing));

        assertThrows(RuntimeException.class,
                () -> userService.updatePassword("bob", "wrongOldPass", "newPass"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPasswordByPhoneHashesNewPassword() {
        User existing = user("carol");
        when(userRepository.findByPhone("0700000000")).thenReturn(Optional.of(existing));

        userService.resetPasswordByPhone("0700000000", "freshPass");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertTrue(passwordEncoder.matches("freshPass", captor.getValue().getPassword()));
    }

    @Test
    void updateProfileOnlyChangesFieldsThatArePresent() {
        User existing = user("dora");
        existing.setFirstName("OldFirst");
        existing.setLastName("OldLast");
        existing.setDistrict("OldDistrict");
        when(userRepository.findByUsername("dora")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setFirstName("NewFirst");

        User updated = userService.updateProfile("dora", request);

        assertEquals("NewFirst", updated.getFirstName());
        assertEquals("OldLast", updated.getLastName());
        assertEquals("OldDistrict", updated.getDistrict());
        assertNotNull(updated.getUpdatedAt());
    }

    @Test
    void updateProfileBlankStringsAreTreatedAsNoChange() {
        User existing = user("eve");
        existing.setVillage("OldVillage");
        when(userRepository.findByUsername("eve")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setVillage("");

        User updated = userService.updateProfile("eve", request);

        assertEquals("OldVillage", updated.getVillage());
    }

    @Test
    void updateProfileAllowsEmailChangeWhenUnused() {
        User existing = user("frank");
        existing.setEmail("old@example.com");
        when(userRepository.findByUsername("frank")).thenReturn(Optional.of(existing));
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setEmail("new@example.com");

        User updated = userService.updateProfile("frank", request);

        assertEquals("new@example.com", updated.getEmail());
    }

    @Test
    void updateProfileRejectsEmailAlreadyUsedByAnotherAccount() {
        User existing = user("frank");
        existing.setEmail("old@example.com");
        User someoneElse = user("gina");
        someoneElse.setEmail("taken@example.com");
        when(userRepository.findByUsername("frank")).thenReturn(Optional.of(existing));
        when(userRepository.findByEmail("taken@example.com")).thenReturn(Optional.of(someoneElse));

        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setEmail("taken@example.com");

        assertThrows(RuntimeException.class, () -> userService.updateProfile("frank", request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateProfileAllowsReSubmittingOwnCurrentEmail() {
        User existing = user("frank");
        existing.setEmail("mine@example.com");
        when(userRepository.findByUsername("frank")).thenReturn(Optional.of(existing));
        when(userRepository.findByEmail("mine@example.com")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setEmail("mine@example.com");

        User updated = userService.updateProfile("frank", request);

        assertEquals("mine@example.com", updated.getEmail());
    }

    @Test
    void getProfileDelegatesToFindByUsername() {
        User existing = user("henry");
        when(userRepository.findByUsername("henry")).thenReturn(Optional.of(existing));

        assertSame(existing, userService.getProfile("henry"));
    }

    @Test
    void getProfileThrowsResourceNotFoundWhenAbsent() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getProfile("nobody"));
    }
}
