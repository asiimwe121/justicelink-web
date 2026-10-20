package lcdjp.cases;

import lcdjp.common.CacheConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The test profile uses Caffeine, which keeps objects in memory, so a value Redis cannot round-trip
 * passes every other test and then fails in production on the second request. These tests push cached
 * values through the same JSON serializer Redis uses.
 */
class CacheSerializationTest {

    private final GenericJackson2JsonRedisSerializer serializer = CacheConfig.valueSerializer();

    @Test
    void statisticsMapsSurviveTheRedisJsonRoundTrip() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalCases", 12);
        stats.put("pendingCases", 3);
        stats.put("withLawyers", 0);

        Object back = serializer.deserialize(serializer.serialize(stats));

        assertEquals(stats, back);
    }

    @Test
    void districtAdminStatisticsMapSurvivesTheRoundTrip() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", 4);
        stats.put("active", 3);

        assertEquals(stats, serializer.deserialize(serializer.serialize(stats)));
    }

    @Test
    void noCacheableMethodReturnsAResponseEntity() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Component.class));

        List<String> offenders = new ArrayList<>();
        for (BeanDefinition definition : scanner.findCandidateComponents("lcdjp")) {
            Class<?> type = Class.forName(definition.getBeanClassName());
            for (Method method : type.getDeclaredMethods()) {
                if (method.isAnnotationPresent(Cacheable.class)
                        && ResponseEntity.class.isAssignableFrom(method.getReturnType())) {
                    offenders.add(type.getSimpleName() + "." + method.getName());
                }
            }
        }

        assertTrue(offenders.isEmpty(),
                "@Cacheable methods must not return ResponseEntity (Redis cannot read it back): " + offenders);
    }

    @Test
    void theStatisticsServiceMethodsReturnMaps() throws Exception {
        for (String name : new String[] {"caseStatistics", "adminStatistics"}) {
            Method method = StatisticsService.class.getMethod(name);
            assertTrue(method.isAnnotationPresent(Cacheable.class), name);
            assertTrue(Map.class.isAssignableFrom(method.getReturnType()), name);
        }
    }
}
