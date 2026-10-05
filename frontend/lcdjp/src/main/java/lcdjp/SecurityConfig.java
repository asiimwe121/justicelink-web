package lcdjp;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final TokenBlacklistService tokenBlacklistService;
    private final SessionRevocationService sessionRevocationService;

    public SecurityConfig(JwtUtil jwtUtil, @Lazy UserService userService, TokenBlacklistService tokenBlacklistService,
                          SessionRevocationService sessionRevocationService) {
        this.jwtUtil = jwtUtil;
        this.userService = userService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.sessionRevocationService = sessionRevocationService;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        logger.info("Creating JwtAuthenticationFilter");
        return new JwtAuthenticationFilter(jwtUtil, userService, tokenBlacklistService, sessionRevocationService);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(jsonAuthenticationEntryPoint())
                        .accessDeniedHandler(jsonAccessDeniedHandler()))
                .authorizeHttpRequests(authz -> authz

                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/login/verify-otp").permitAll()
                        .requestMatchers("/api/auth/login/resend-otp").permitAll()
                        .requestMatchers("/api/auth/register").permitAll()
                        .requestMatchers("/api/auth/register-pending").permitAll()
                        .requestMatchers("/api/auth/send-otp").permitAll()
                        .requestMatchers("/api/auth/verify-otp").permitAll()
                        .requestMatchers("/api/auth/forgot-password").permitAll()
                        .requestMatchers("/api/auth/reset-password").permitAll()
                        .requestMatchers("/api/auth/reset-link/validate").permitAll()
                        .requestMatchers("/api/auth/reset-link/confirm").permitAll()
                        .requestMatchers("/api/auth/logout").permitAll()
                        .requestMatchers("/api/auth/refresh").permitAll()
                        .requestMatchers("/api/auth/jwt/validate").permitAll()
                        .requestMatchers("/api/auth/verification/submit").permitAll()
                        .requestMatchers("/api/auth/recaptcha-config").permitAll()
                        .requestMatchers("/api/verification/**").authenticated()
                        .requestMatchers("/api/ai/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/legal-orgs/**").permitAll()
                        .requestMatchers("/api/legal-orgs/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/legal-alerts/**").permitAll()
                        .requestMatchers("/api/legal-alerts/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN")
                        .requestMatchers("/api/config/**").permitAll()
                        .requestMatchers("/api/map/config").permitAll()
                        .requestMatchers("/api/map/reverse-geocode").permitAll()
                        .requestMatchers("/api/map/route").permitAll()
                        .requestMatchers("/api/map/**").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/actuator/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN")
                        .requestMatchers("/api/activity/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN", "DISTRICT_ADMIN")
                        .requestMatchers("/api/monitoring/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN")
                        .requestMatchers("/*.html", "/**/*.html").permitAll()
                        .requestMatchers("/*.css", "/**/*.css").permitAll()
                        .requestMatchers("/*.js", "/**/*.js").permitAll()
                        .requestMatchers("/static/**", "/images/**", "/css/**", "/js/**").permitAll()
                        .requestMatchers("/favicon.ico", "/manifest.json", "/robots.txt", "/sitemap.xml").permitAll()
                        .requestMatchers("/js/**").permitAll()
                        .requestMatchers("/favicon.ico").permitAll()
                        .requestMatchers("/manifest.json").permitAll()
                        .requestMatchers("/robots.txt").permitAll()
                        .requestMatchers("/sitemap.xml").permitAll()
                        .requestMatchers("/", "/index.html").permitAll()
                        .requestMatchers("/api-docs/**").permitAll()
                        .requestMatchers("/swagger-ui/**").permitAll()
                        .requestMatchers("/swagger-ui.html").permitAll()

                        .requestMatchers("/api/auth/users/**").authenticated()
                        .requestMatchers("/api/auth/notifications/**").authenticated()
                        .requestMatchers("/api/auth/chat/**").authenticated()
                        .requestMatchers("/api/auth/documents/**").authenticated()
                        .requestMatchers("/api/auth/verification-status/**").authenticated()
                        .requestMatchers("/api/auth/profile/**").authenticated()
                        .requestMatchers("/api/translate/**").authenticated()
                        .requestMatchers("/api/cases/**").authenticated()
                        .requestMatchers("/api/legal/**").authenticated()
                        .requestMatchers("/api/lawyer/**").authenticated()
                        .requestMatchers("/api/district-admin/**").hasAnyAuthority("SYSTEM_ADMIN", "Admin", "DISTRICT_ADMIN")
                        .requestMatchers("/api/lc/**").hasAnyAuthority("SYSTEM_ADMIN", "Admin", "DISTRICT_ADMIN")
                        .requestMatchers("/api/account-creation/**").hasAnyAuthority("SYSTEM_ADMIN", "Admin", "DISTRICT_ADMIN")

                        .requestMatchers("/api/admin/search").hasAnyAuthority("Admin", "SYSTEM_ADMIN", "DISTRICT_ADMIN")
                        .requestMatchers("/api/admin/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN")
                        .requestMatchers("/api/audit/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN")
                        .requestMatchers("/api/admin/verification-requests").hasAnyAuthority("Admin", "SYSTEM_ADMIN")
                        .requestMatchers("/api/admin/verify-user/**").hasAnyAuthority("Admin", "SYSTEM_ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationEntryPoint jsonAuthenticationEntryPoint() {
        return (request, response, exception) ->
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Authentication required");
    }

    @Bean
    public AccessDeniedHandler jsonAccessDeniedHandler() {
        return (request, response, exception) ->
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Access denied");
    }

    private void writeJsonError(HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
                "https://justicelinkug.org",
                "https://www.justicelinkug.org",
                "https://justicelinkug.com",
                "https://www.justicelinkug.com",
                "http://localhost:8080",
                "http://localhost:3000",
                "http://localhost:5500",
                "http://127.0.0.1:5500"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}