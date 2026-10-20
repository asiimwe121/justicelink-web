package lcdjp.ai;

import lcdjp.common.RateLimited;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiIntakeController {

    private final AiIntakeService intakeService;

    public AiIntakeController(AiIntakeService intakeService) {
        this.intakeService = intakeService;
    }

    @PostMapping("/intake")
    @RateLimited(limit = 15, durationMinutes = 1, dailyLimit = 100, globalDailyLimit = 2000, failClosed = true)
    public ResponseEntity<AiIntakeResponse> intake(@RequestBody AiIntakeRequest request) {
        return ResponseEntity.ok(intakeService.handle(request));
    }
}
