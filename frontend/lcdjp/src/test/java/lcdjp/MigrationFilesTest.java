package lcdjp;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the migration folder now that Flyway runs with out-of-order=false and validate-on-migrate=true.
 * The rules are written up in db/migration/README.md.
 */
class MigrationFilesTest {

    private static final Pattern NAME = Pattern.compile("^V(\\d+)__[A-Za-z0-9_]+\\.sql$");

    /** Versions that are deliberately missing. Add to this only with a note in the README. */
    private static final List<Integer> KNOWN_GAPS = List.of(6);

    private static List<Integer> versions() throws Exception {
        Resource[] files = new PathMatchingResourcePatternResolver().getResources("classpath:db/migration/*.sql");
        List<Integer> versions = new ArrayList<>();
        for (Resource file : files) {
            String name = file.getFilename();
            Matcher m = NAME.matcher(name == null ? "" : name);
            assertTrue(m.matches(), "Migration file name must look like V<number>__description.sql: " + name);
            versions.add(Integer.parseInt(m.group(1)));
        }
        versions.sort(Integer::compare);
        return versions;
    }

    @Test
    void migrationsExist() throws Exception {
        assertFalse(versions().isEmpty(), "no migrations found on the classpath");
    }

    @Test
    void versionNumbersAreUnique() throws Exception {
        List<Integer> versions = versions();
        assertEquals(versions.stream().distinct().count(), versions.size(), "duplicate migration version in " + versions);
    }

    @Test
    void onlyTheDocumentedGapsExistBelowTheHighestVersion() throws Exception {
        List<Integer> versions = versions();
        int highest = versions.get(versions.size() - 1);
        List<Integer> missing = new ArrayList<>();
        for (int v = 1; v < highest; v++) {
            if (!versions.contains(v)) {
                missing.add(v);
            }
        }
        assertEquals(KNOWN_GAPS, missing,
                "Migration numbers must not have new gaps, and a documented gap must not be filled. "
                        + "A late low-numbered migration is rejected by Flyway on databases already past it: "
                        + "renumber it above " + highest + ".");
    }
}
