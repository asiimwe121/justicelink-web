package lcdjp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@SpringBootApplication
@EnableCaching
@EnableAspectJAutoProxy
@EnableScheduling
@RestController
public class LcdjpApplication {

    private static final Logger log = LoggerFactory.getLogger(LcdjpApplication.class);

    public static void main(String[] args) {

        log.info("========================================");
        log.info("🔍 Environment Configuration Status");
        log.info("========================================");

        String groqKey = System.getenv("GROQ_API_KEY");
        String geminiKey = System.getenv("GEMINI_API_KEY");
        String huggingFaceKey = System.getenv("HUGGINGFACE_API_KEY");
        String googleMapsKey = System.getenv("GOOGLE_MAPS_API_KEY");
        String dbPassword = System.getenv("DB_PASSWORD");

        if (groqKey != null && !groqKey.isEmpty() && !groqKey.startsWith("your_")) {
            log.info("✅ GROQ_API_KEY (AI chat): {}", maskKey(groqKey));
        } else {
            log.warn("⚠️ GROQ_API_KEY is not set in environment variables, AI chat will return the fallback reply");
            log.warn("   Set it using: export GROQ_API_KEY=your_key_here");
        }

        if (geminiKey != null && !geminiKey.isEmpty() && !geminiKey.startsWith("your_")) {
            log.info("✅ GEMINI_API_KEY (AI chat failover): {}", maskKey(geminiKey));
        } else {
            log.warn("⚠️ GEMINI_API_KEY is not set, so there is no backup AI provider if Groq fails");
        }

        if (huggingFaceKey != null && !huggingFaceKey.isEmpty() && !huggingFaceKey.startsWith("your_")) {
            log.info("✅ HUGGINGFACE_API_KEY (embeddings only): {}", maskKey(huggingFaceKey));
        } else {
            log.warn("⚠️ HUGGINGFACE_API_KEY is not set in environment variables (needed for legal-knowledge embeddings)");
            log.warn("   Set it using: export HUGGINGFACE_API_KEY=your_key_here");
        }

        if (googleMapsKey != null && !googleMapsKey.isEmpty() && !googleMapsKey.startsWith("your_")) {
            log.info("✅ GOOGLE_MAPS_API_KEY: {}", maskKey(googleMapsKey));
        } else {
            log.warn("⚠️ GOOGLE_MAPS_API_KEY is not set in environment variables");
            log.warn("   Set it using: export GOOGLE_MAPS_API_KEY=your_key_here");
        }

        if (dbPassword != null && !dbPassword.isEmpty()) {
            log.info("✅ DB_PASSWORD: is set ({} characters)", dbPassword.length());
        } else {
            log.warn("⚠️ DB_PASSWORD is not set in environment variables");
            log.warn("   Set it using: export DB_PASSWORD=your_password_here");
        }

        log.info("========================================");

        SpringApplication.run(LcdjpApplication.class, args);
        log.info("✅ LCDJP Backend started on port 8080");
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "OK", "message", "Backend is running");
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(
                                "https://justicelinkug.org",
                                "https://www.justicelinkug.org",
                                "http://justicelinkug.org",
                                "http://www.justicelinkug.org",
                                "https://justicelinkug.com",
                                "https://www.justicelinkug.com",
                                "http://justicelinkug.com",
                                "http://www.justicelinkug.com",
                                "http://127.0.0.1:5500",
                                "http://localhost:5500",
                                "http://127.0.0.1:5501",
                                "http://localhost:5501",
                                "http://localhost:8080",
                                "http://127.0.0.1:8080"
                        )
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }

    private static String maskKey(String key) {
        if (key == null || key.isEmpty()) return "NOT SET";
        if (key.length() <= 10) return "***";
        return key.substring(0, 8) + "..." + key.substring(key.length() - 4);
    }
}