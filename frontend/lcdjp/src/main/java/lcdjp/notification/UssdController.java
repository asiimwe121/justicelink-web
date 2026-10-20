package lcdjp.notification;

import lcdjp.user.PhoneUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Callback for Africa's Talking USSD. Africa's Talking does not sign these requests, so the callback URL
 * carries a secret key (set it in the dashboard as .../api/ussd?key=...). With no key configured the
 * endpoint answers 404, so USSD stays switched off until it is deliberately set up.
 */
@RestController
@RequestMapping("/api/ussd")
public class UssdController {

    @Value("${app.ussd.callback-key:}")
    private String callbackKey;

    @Autowired
    private UssdBackend backend;

    @PostMapping(produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> callback(
            @RequestParam(name = "key", required = false) String key,
            @RequestParam(name = "phoneNumber", required = false) String phoneNumber,
            @RequestParam(name = "text", required = false) String text) {

        if (callbackKey == null || callbackKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (key == null || !MessageDigest.isEqual(
                key.getBytes(StandardCharsets.UTF_8), callbackKey.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (PhoneUtil.normalizeLast9(phoneNumber) == null) {
            return ResponseEntity.ok("END We could not read your phone number. Please try again.");
        }

        String reply;
        try {
            reply = new UssdMenu(backend).handle(phoneNumber, text);
        } catch (Exception e) {
            reply = "END Something went wrong. Please try again. Danger now? Call 999.";
        }
        return ResponseEntity.ok(reply);
    }
}
