package lcdjp;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Component
public class LegalKnowledgeScanner {

    private final LegalDocumentTextExtractor extractor;

    public LegalKnowledgeScanner(LegalDocumentTextExtractor extractor) {
        this.extractor = extractor;
    }

    public Path resolveRoot(String configuredDir) {
        if (configuredDir == null || configuredDir.isBlank()) {
            throw new IllegalStateException(
                    "LEGAL_KNOWLEDGE_DIR is not configured. Set the environment variable " +
                    "(or legal.knowledge.dir) to the legal-document library location.");
        }
        return Paths.get(configuredDir);
    }

    public void validate(Path root) {
        if (!Files.exists(root)) {
            throw new IllegalStateException("Legal knowledge directory does not exist: configured path not found. " +
                    "Check LEGAL_KNOWLEDGE_DIR.");
        }
        if (!Files.isDirectory(root)) {
            throw new IllegalStateException("LEGAL_KNOWLEDGE_DIR does not point to a directory.");
        }
        if (!Files.isReadable(root)) {
            throw new IllegalStateException("Legal knowledge directory is not readable by the application process.");
        }
    }

    public List<Path> scanAllFiles(Path root) throws IOException {
        List<Path> files = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(root)) {
            walk.filter(Files::isRegularFile)
                    .sorted(Comparator.naturalOrder())
                    .forEach(files::add);
        }
        return files;
    }

    public List<Path> scanSupportedFiles(Path root) throws IOException {
        List<Path> all = scanAllFiles(root);
        List<Path> supported = new ArrayList<>();
        for (Path p : all) {
            if (extractor.isSupported(p)) supported.add(p);
        }
        return supported;
    }
}
