package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.annotation.Annotation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateLimitingAspectTest {

    @Mock
    private RateLimiterService rateLimiterService;
    @Mock
    private ProceedingJoinPoint joinPoint;
    @Mock
    private HttpServletRequest request;

    private MockedStatic<RequestContextHolder> requestContextHolder;

    private final RateLimited rateLimited = new RateLimited() {
        @Override
        public int limit() {
            return 5;
        }

        @Override
        public int durationMinutes() {
            return 15;
        }

        @Override
        public Class<? extends Annotation> annotationType() {
            return RateLimited.class;
        }
    };

    @AfterEach
    void tearDown() {
        if (requestContextHolder != null) {
            requestContextHolder.close();
        }
    }

    private void mockRequest() {
        ServletRequestAttributes attributes = mock(ServletRequestAttributes.class);
        when(attributes.getRequest()).thenReturn(request);
        requestContextHolder = mockStatic(RequestContextHolder.class);
        requestContextHolder.when(RequestContextHolder::getRequestAttributes).thenReturn(attributes);
    }

    @Test
    void byDefault_spoofedForwardedForHeader_isIgnored_keyUsesRemoteAddr() throws Throwable {
        mockRequest();
        RateLimitingAspect aspect = new RateLimitingAspect(rateLimiterService);

        when(request.getRemoteAddr()).thenReturn("10.0.0.9");
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(rateLimiterService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);

        aspect.rateLimit(joinPoint, rateLimited);

        verify(rateLimiterService).isAllowed("10.0.0.9:/api/auth/login", 5, 15);
        verify(joinPoint).proceed();
    }

    @Test
    void whenProxyHeadersTrusted_forwardedForIsUsed() throws Throwable {
        mockRequest();
        RateLimitingAspect aspect = new RateLimitingAspect(rateLimiterService);
        ReflectionTestUtils.setField(aspect, "trustProxyHeaders", true);

        when(request.getHeader("X-Forwarded-For")).thenReturn("1.2.3.4, 10.0.0.1");
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(rateLimiterService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);

        aspect.rateLimit(joinPoint, rateLimited);

        verify(rateLimiterService).isAllowed("1.2.3.4:/api/auth/login", 5, 15);
        verify(request, never()).getRemoteAddr();
    }

    @Test
    void whenLimitExceeded_throwsRateLimitExceededException_andDoesNotProceed() throws Throwable {
        mockRequest();
        RateLimitingAspect aspect = new RateLimitingAspect(rateLimiterService);

        when(request.getRemoteAddr()).thenReturn("10.0.0.9");
        when(request.getRequestURI()).thenReturn("/api/auth/forgot-password");
        when(rateLimiterService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(false);

        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class,
                () -> aspect.rateLimit(joinPoint, rateLimited));

        assertEquals(15 * 60, ex.getRetryAfterSeconds());
        verify(joinPoint, never()).proceed();
    }

    @Test
    void whenNoRequestContext_proceedsWithoutRateLimiting() throws Throwable {
        requestContextHolder = mockStatic(RequestContextHolder.class);
        requestContextHolder.when(RequestContextHolder::getRequestAttributes).thenReturn(null);
        RateLimitingAspect aspect = new RateLimitingAspect(rateLimiterService);

        aspect.rateLimit(joinPoint, rateLimited);

        verify(joinPoint).proceed();
        verifyNoInteractions(rateLimiterService);
    }
}
