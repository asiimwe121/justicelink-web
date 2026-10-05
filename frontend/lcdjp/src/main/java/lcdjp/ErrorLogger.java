package lcdjp;

import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.ArrayList;
import java.util.List;

@Component
public class ErrorLogger {
    private final List<Map<String, Object>> errorLogs = new ArrayList<>();
    private final int MAX_LOGS = 1000;

    public void logError(String endpoint, String error, String user, String ip) {
        Map<String, Object> log = new ConcurrentHashMap<>();
        log.put("timestamp", LocalDateTime.now());
        log.put("endpoint", endpoint);
        log.put("error", error);
        log.put("user", user);
        log.put("ip", ip);
        errorLogs.add(log);

        if (errorLogs.size() > MAX_LOGS) {
            errorLogs.remove(0);
        }
    }

    public List<Map<String, Object>> getRecentErrors(int count) {
        int size = errorLogs.size();
        int start = Math.max(0, size - count);
        return new ArrayList<>(errorLogs.subList(start, size));
    }
}