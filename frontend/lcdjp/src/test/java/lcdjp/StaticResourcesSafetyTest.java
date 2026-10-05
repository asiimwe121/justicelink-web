package lcdjp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

class StaticResourcesSafetyTest {

    private static final List<String> FORBIDDEN_SUFFIXES = List.of(
            ".properties", ".yml", ".yaml", ".env", ".sql", ".java", ".jar", ".pem", ".key", ".p12",
            ".md", ".bak", ".log");

    @Test
    void staticFolderHoldsOnlyPublicAssets() throws IOException {
        Path staticDir = Paths.get("src", "main", "resources", "static");
        if (!Files.isDirectory(staticDir)) {
            return;
        }
        try (Stream<Path> files = Files.walk(staticDir)) {
            List<String> offenders = files
                    .filter(Files::isRegularFile)
                    .map(p -> staticDir.relativize(p).toString().replace('\\', '/'))
                    .filter(name -> {
                        String lower = name.toLowerCase(Locale.ROOT);
                        return FORBIDDEN_SUFFIXES.stream().anyMatch(lower::endsWith)
                                || lower.startsWith(".") || lower.contains("/.");
                    })
                    .collect(Collectors.toList());
            assertTrue(offenders.isEmpty(),
                    "These files would be publicly downloadable; move them out of static/: " + offenders);
        }
    }
}
