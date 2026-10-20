package lcdjp.admin;

import lcdjp.common.CacheService;
import lcdjp.common.ErrorLogger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/monitoring")
public class MonitoringController {

    @Autowired
    private CacheService cacheService;

    @Autowired
    private ErrorLogger errorLogger;

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("uptime", java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime());
        status.put("memory", Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory());
        status.put("threads", Thread.activeCount());
        status.put("cacheSize", cacheService.getSize());
        status.put("errors", errorLogger.getRecentErrors(10));
        return ResponseEntity.ok(status);
    }

    @GetMapping("/cache")
    public ResponseEntity<?> getCacheInfo() {
        return ResponseEntity.ok(Map.of("cacheSize", cacheService.getSize()));
    }

    @DeleteMapping("/cache")
    public ResponseEntity<?> clearCache() {
        cacheService.clearAll();
        return ResponseEntity.ok(Map.of("success", true, "message", "Cache cleared"));
    }
}