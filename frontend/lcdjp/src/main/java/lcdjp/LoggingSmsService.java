package lcdjp;

import org.springframework.stereotype.Service;

@Service
public class LoggingSmsService implements SmsService {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LoggingSmsService.class);
    @Override
    public void sendSms(String phoneNumber, String message) {
        logger.info("📱 [DEV SMS — no gateway configured] To: " + phoneNumber + " | " + message);
    }
}
