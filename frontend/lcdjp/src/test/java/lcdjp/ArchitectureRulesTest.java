package lcdjp;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Keeps the SQL-out-of-controllers cleanup from slipping back: a controller talks to services and
 * repositories, never to the database directly.
 */
class ArchitectureRulesTest {

    private static final Set<Class<?>> FORBIDDEN_IN_CONTROLLERS = Set.of(
            JdbcTemplate.class, NamedParameterJdbcTemplate.class, DataSource.class);

    @Test
    void controllersDoNotHoldDatabaseAccessObjects() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(Controller.class));

        List<String> violations = new ArrayList<>();
        for (BeanDefinition definition : scanner.findCandidateComponents("lcdjp")) {
            Class<?> type = Class.forName(definition.getBeanClassName(), false,
                    Thread.currentThread().getContextClassLoader());
            for (Field field : type.getDeclaredFields()) {
                if (FORBIDDEN_IN_CONTROLLERS.contains(field.getType())) {
                    violations.add(type.getSimpleName() + "." + field.getName());
                }
            }
        }

        assertTrue(violations.isEmpty(),
                "Controllers must use a repository or service instead of the database directly: " + violations);
    }
}
