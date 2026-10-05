package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PhoneUtil {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public static String normalizeLast9(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() < 9) return null;
        return digits.substring(digits.length() - 9);
    }

    public boolean isAlreadyUsed(String phone, String excludeUsername) {
        String normalized = normalizeLast9(phone);
        if (normalized == null) return false;
        List<String> existingPhones = (excludeUsername == null || excludeUsername.isBlank())
                ? jdbcTemplate.queryForList(
                "SELECT phone FROM users WHERE phone IS NOT NULL AND phone <> ''", String.class)
                : jdbcTemplate.queryForList(
                "SELECT phone FROM users WHERE phone IS NOT NULL AND phone <> '' AND username <> ?",
                String.class, excludeUsername);
        for (String existing : existingPhones) {
            if (normalized.equals(normalizeLast9(existing))) {
                return true;
            }
        }
        return false;
    }
}
