package lcdjp;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashGenerator {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(HashGenerator.class);
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("12345678");
        logger.info("Hash for '12345678': " + hash);
    }
}