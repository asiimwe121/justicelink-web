package lcdjp.common;

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

    @Value("${app.trusted-proxy-hops:0}")
    private int trustedProxyHops;

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

        if (!rateLimiterService.isAllowed(key, limit, duration, rateLimited.failClosed())) {
            long retryAfterSeconds = Duration.ofMinutes(duration).getSeconds();
            throw new RateLimitExceededException(
                    "Rate limit exceeded. Please try again later.", retryAfterSeconds);
        }

        if (rateLimited.dailyLimit() > 0
                && !rateLimiterService.isAllowed(key + ":daily", rateLimited.dailyLimit(), 24 * 60, rateLimited.failClosed())) {
            throw new RateLimitExceededException(
                    "Daily limit reached. Please try again tomorrow.", Duration.ofHours(24).getSeconds());
        }

        if (rateLimited.globalDailyLimit() > 0
                && !rateLimiterService.isAllowed("global:" + request.getRequestURI() + ":daily",
                        rateLimited.globalDailyLimit(), 24 * 60, rateLimited.failClosed())) {
            throw new RateLimitExceededException(
                    "This service is busy right now. Please try again later.", Duration.ofHours(1).getSeconds());
        }

        return joinPoint.proceed();
    }

    private String getClientIp(HttpServletRequest request) {
        return ClientIp.resolve(request, trustProxyHeaders, trustedProxyHops);
    }
}
