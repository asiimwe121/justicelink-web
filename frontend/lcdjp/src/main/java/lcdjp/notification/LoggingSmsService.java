package lcdjp.notification;

import org.springframework.stereotype.Service;

@Service
public class LoggingSmsService implements SmsService {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LoggingSmsService.class);
    @Override
    public void sendSms(String phoneNumber, String message) {
        SmsContentGuard.requireNeutral(message);
        logger.info("📱 [DEV SMS — no gateway configured] To: " + phoneNumber + " | " + message);
    }
}
