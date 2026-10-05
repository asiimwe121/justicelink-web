package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/account-creation")
public class AccountCreationVerificationController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AccountCreationVerificationController.class);
    @Autowired
    private AccountCreationOtpService otpService;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody AccountCreationOtpRequest request,
                                     HttpServletRequest httpRequest) {
        String purpose = request.getPurpose().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String phone = request.getPhone() == null ? "" : request.getPhone().trim();

        try {
            Map<String, Object> result = otpService.sendOtp(httpRequest, purpose, email, phone);
            return ResponseEntity.ok(result);
        } catch (AccountCreationOtpService.TooManyRequestsException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("success", false, "error", "Request could not be processed. Please try again later."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Request could not be processed. Please try again later."));
        } catch (Exception e) {
            logger.error("❌ Error sending account-creation OTP: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Could not send verification code. Please try again later."));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody AccountCreationOtpVerifyRequest request,
                                       HttpServletRequest httpRequest) {
        String purpose = request.getPurpose().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String phone = request.getPhone() == null ? "" : request.getPhone().trim();
        String otp = request.getOtp().trim();

        Map<String, Object> result = otpService.verifyOtp(httpRequest, purpose, email, phone, otp);
        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
    }
}
