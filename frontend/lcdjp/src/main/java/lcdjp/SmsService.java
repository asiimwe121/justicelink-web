package lcdjp;

public interface SmsService {
    void sendSms(String phoneNumber, String message) throws Exception;
}
