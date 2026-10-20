package lcdjp.common;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {
    int limit() default 10;
    int durationMinutes() default 1;

    /** Optional per-client cap over a rolling 24h window (0 = off). Stops slow, steady abuse the per-minute limit lets through. */
    int dailyLimit() default 0;

    /** Optional cap over 24h across ALL clients for this endpoint (0 = off). A hard ceiling on spend for paid back-ends. */
    int globalDailyLimit() default 0;

    /** When true, deny (rather than allow) requests if the limiter backend (Redis) is down. Use for paid endpoints. */
    boolean failClosed() default false;
}