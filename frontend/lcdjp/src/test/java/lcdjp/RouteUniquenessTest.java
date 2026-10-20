package lcdjp;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Two handlers with the same HTTP method and path shape (only the {variable} names differ) are not
 * rejected at startup, but every request to that path then fails with "Ambiguous handler methods".
 * Unit tests call controller methods directly, so nothing else would notice.
 */
class RouteUniquenessTest {

    @Test
    void noTwoHandlersShareTheSameRoute() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(Controller.class));

        Map<String, List<String>> routes = new LinkedHashMap<>();
        for (BeanDefinition definition : scanner.findCandidateComponents("lcdjp")) {
            Class<?> type = Class.forName(definition.getBeanClassName(), false,
                    Thread.currentThread().getContextClassLoader());
            RequestMapping classMapping = AnnotatedElementUtils.findMergedAnnotation(type, RequestMapping.class);
            List<String> prefixes = classMapping == null || classMapping.path().length == 0
                    ? List.of("") : Arrays.asList(classMapping.path());

            for (Method method : type.getDeclaredMethods()) {
                RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                if (mapping == null) {
                    continue;
                }
                List<String> paths = mapping.path().length == 0 ? List.of("") : Arrays.asList(mapping.path());
                String conditions = Arrays.toString(mapping.method()) + Arrays.toString(mapping.params())
                        + Arrays.toString(mapping.headers()) + Arrays.toString(mapping.consumes())
                        + Arrays.toString(mapping.produces());
                for (String prefix : prefixes) {
                    for (String path : paths) {
                        String full = ("/" + prefix + "/" + path).replaceAll("/+", "/")
                                .replaceAll("\\{[^}/]+}", "{}");
                        routes.computeIfAbsent(conditions + " " + full, k -> new ArrayList<>())
                                .add(type.getSimpleName() + "." + method.getName());
                    }
                }
            }
        }

        List<String> duplicates = new ArrayList<>();
        routes.forEach((route, handlers) -> {
            if (handlers.size() > 1) {
                duplicates.add(route + " -> " + handlers);
            }
        });
        assertTrue(duplicates.isEmpty(), "Routes mapped by more than one handler: " + duplicates);
    }
}
