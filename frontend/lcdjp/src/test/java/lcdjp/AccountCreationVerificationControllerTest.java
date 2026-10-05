package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountCreationVerificationControllerTest {

    @Mock private AccountCreationOtpService otpService;
    @Mock private HttpServletRequest httpRequest;

    @InjectMocks
    private AccountCreationVerificationController controller;

    private AccountCreationOtpRequest sendRequest(String purpose, String email, String phone) {
        AccountCreationOtpRequest r = new AccountCreationOtpRequest();
        r.setPurpose(purpose);
        r.setEmail(email);
        r.setPhone(phone);
        return r;
    }

    private AccountCreationOtpVerifyRequest verifyRequest(String purpose, String email, String phone, String otp) {
        AccountCreationOtpVerifyRequest r = new AccountCreationOtpVerifyRequest();
        r.setPurpose(purpose);
        r.setEmail(email);
        r.setPhone(phone);
        r.setOtp(otp);
        return r;
    }

    @Test
    void sendOtp_success_returns200WithServiceResult() throws Exception {
        when(otpService.sendOtp(eq(httpRequest), eq("district_admin_creation"), eq("a@b.com"), eq("")))
                .thenReturn(Map.of("success", true));

        ResponseEntity<?> result = controller.sendOtp(sendRequest(" district_admin_creation ", " a@b.com ", null), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void sendOtp_tooManyRequests_returns429() throws Exception {
        when(otpService.sendOtp(any(), anyString(), anyString(), anyString()))
                .thenThrow(new AccountCreationOtpService.TooManyRequestsException("slow down"));

        ResponseEntity<?> result = controller.sendOtp(sendRequest("lc_creation", "a@b.com", ""), httpRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
    }

    @Test
    void sendOtp_illegalArgument_returns400() throws Exception {
        when(otpService.sendOtp(any(), anyString(), anyString(), anyString()))
                .thenThrow(new IllegalArgumentException("missing contact"));

        ResponseEntity<?> result = controller.sendOtp(sendRequest("lc_creation", "", ""), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void sendOtp_unexpectedException_returns500_withGenericMessage() throws Exception {
        when(otpService.sendOtp(any(), anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("smtp exploded"));

        ResponseEntity<?> result = controller.sendOtp(sendRequest("lc_creation", "a@b.com", ""), httpRequest);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
        assertEquals("Could not send verification code. Please try again later.",
                ((Map<?, ?>) result.getBody()).get("error"));
    }

    @Test
    void verifyOtp_serviceReportsSuccess_returns200() {
        when(otpService.verifyOtp(eq(httpRequest), eq("lc_creation"), eq("a@b.com"), eq(""), eq("123456")))
                .thenReturn(Map.of("success", true));

        ResponseEntity<?> result = controller.verifyOtp(verifyRequest("lc_creation", "a@b.com", "", "123456"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void verifyOtp_serviceReportsFailure_returns401_notJustEchoingService() {
        when(otpService.verifyOtp(any(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of("success", false, "error", "invalid code"));

        ResponseEntity<?> result = controller.verifyOtp(verifyRequest("lc_creation", "a@b.com", "", "000000"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        assertEquals("invalid code", ((Map<?, ?>) result.getBody()).get("error"));
    }

    @Test
    void verifyOtp_trimsPurposeEmailPhoneOtp_beforeCallingService() {
        when(otpService.verifyOtp(eq(httpRequest), eq("lc_creation"), eq("a@b.com"), eq("+256700000000"), eq("123456")))
                .thenReturn(Map.of("success", true));

        controller.verifyOtp(verifyRequest(" lc_creation ", " a@b.com ", " +256700000000 ", " 123456 "), httpRequest);

        verify(otpService).verifyOtp(eq(httpRequest), eq("lc_creation"), eq("a@b.com"), eq("+256700000000"), eq("123456"));
    }
}
