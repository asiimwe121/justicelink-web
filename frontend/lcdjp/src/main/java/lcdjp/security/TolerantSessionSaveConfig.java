package lcdjp.security;

import org.aopalliance.intercept.MethodInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.data.redis.RedisSessionRepository;

/**
 * RedisSessionRepository.save() throws "Session was invalidated" when the session key has vanished from
 * Redis between the moment a request loaded it and the moment the response is committed (expiry, a Redis
 * restart/eviction, or a parallel request). This app authenticates with the JWT, not the HTTP session, so a
 * session that disappeared mid-request must not turn an otherwise good response into an HTTP 500.
 * The failed save is dropped (the client simply gets a fresh session next time it needs one).
 */
@Configuration
public class TolerantSessionSaveConfig {

    private static final Logger logger = LoggerFactory.getLogger(TolerantSessionSaveConfig.class);

    @org.springframework.context.annotation.Bean
    public static BeanPostProcessor tolerantRedisSessionRepositoryPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (!(bean instanceof RedisSessionRepository)) {
                    return bean;
                }
                ProxyFactory factory = new ProxyFactory(bean);
                factory.setProxyTargetClass(true);
                factory.addAdvice((MethodInterceptor) invocation -> {
                    try {
                        return invocation.proceed();
                    } catch (IllegalStateException e) {
                        if ("save".equals(invocation.getMethod().getName())
                                && e.getMessage() != null
                                && e.getMessage().contains("Session was invalidated")) {
                            logger.debug("Session expired before it could be saved; ignoring");
                            return null;
                        }
                        throw e;
                    }
                });
                return factory.getProxy();
            }
        };
    }
}
