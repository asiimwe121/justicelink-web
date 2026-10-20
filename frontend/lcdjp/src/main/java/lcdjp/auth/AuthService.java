package lcdjp.auth;

import lcdjp.security.JwtUtil;
import lcdjp.user.User;
import lcdjp.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public AuthResponse authenticate(AuthRequest request) {
        User user = userService.findByUsername(request.getUsername());

        if (!userService.validatePassword(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        if (!user.isActive()) {
            throw new RuntimeException("User account is deactivated");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setUsername(user.getUsername());
        response.setRole(user.getRole());
        response.setFullName(user.getFullName());

        return response;
    }
}