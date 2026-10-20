package lcdjp.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * The password encoder lives in its own configuration class with no dependencies.
 *
 * It used to be defined inside {@link SecurityConfig}, which needs several other services to be built. With circular
 * references allowed, a controller that asked for the encoder while SecurityConfig was still being built could not
 * find it ("No qualifying bean of type BCryptPasswordEncoder") and the whole application failed to start.
 * A configuration class with nothing to inject can always be built first, so the encoder is always available.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
