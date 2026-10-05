package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;

@Aspect
@Component
public class RateLimitingAspect {

    private final RateLimiterService rateLimiterService;

    @Value("${app.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;

    public RateLimitingAspect(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Around("@annotation(rateLimited)")
    public Object rateLimit(ProceedingJoinPoint joinPoint, RateLimited rateLimited) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return joinPoint.proceed();
        }

        HttpServletRequest request = attributes.getRequest();
        String clientIp = getClientIp(request);
        String key = clientIp + ":" + request.getRequestURI();

        int limit = rateLimited.limit();
        int duration = rateLimited.durationMinutes();

        if (!rateLimiterService.isAllowed(key, limit, duration)) {
            long retryAfterSeconds = Duration.ofMinutes(duration).getSeconds();
            throw new RateLimitExceededException(
                    "Rate limit exceeded. Please try again later.", retryAfterSeconds);
        }

        return joinPoint.proceed();
    }

    private String getClientIp(HttpServletRequest request) {
        if (trustProxyHeaders) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isEmpty()) {
                return realIp;
            }
        }
        return request.getRemoteAddr();
    }
}