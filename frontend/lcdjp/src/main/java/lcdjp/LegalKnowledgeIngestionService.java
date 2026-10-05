package lcdjp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class LegalKnowledgeIngestionService {

    private static final Logger log = LoggerFactory.getLogger(LegalKnowledgeIngestionService.class);

    private final LegalKnowledgeProperties properties;
    private final LegalKnowledgeScanner scanner;
    private final LegalDocumentTextExtractor extractor;
    private final LegalAwareChunker chunker;
    private final EmbeddingProvider embeddingProvider;
    private final LegalSourceDocumentRepository sourceDocRepo;
    private final LegalDocumentChunkRepository chunkRepo;

    private final AtomicBoolean running = new AtomicBoolean(false);

    public LegalKnowledgeIngestionService(LegalKnowledgeProperties properties,
                                           LegalKnowledgeScanner scanner,
                                           LegalDocumentTextExtractor extractor,
                                           LegalAwareChunker chunker,
                                           EmbeddingProvider embeddingProvider,
                                           LegalSourceDocumentRepository sourceDocRepo,
                                           LegalDocumentChunkRepository chunkRepo) {
        this.properties = properties;
        this.scanner = scanner;
        this.extractor = extractor;
        this.chunker = chunker;
        this.embeddingProvider = embeddingProvider;
        this.sourceDocRepo = sourceDocRepo;
        this.chunkRepo = chunkRepo;
    }

    public LegalIngestionSummary ingest() throws Exception {
        if (!running.compareAndSet(false, true)) {
            throw new IllegalStateException("Legal ingestion is already running — try again once it finishes.");
        }
        try {
            log.info("Legal ingestion started");
            LegalIngestionSummary summary = new LegalIngestionSummary();

            Path root = scanner.resolveRoot(properties.getDir());
            log.info("Scanning legal knowledge directory");
            scanner.validate(root);

            List<Path> allFiles = scanner.scanAllFiles(root);
            summary.filesDiscovered = allFiles.size();

            List<Path> supportedFiles = allFiles.stream().filter(extractor::isSupported).toList();
            summary.supportedFiles = supportedFiles.size();

            for (Path file : supportedFiles) {
                String relativePath = root.relativize(file).toString().replace('\\', '/');
                log.info("Document discovered: {}", relativePath);
                try {
                    processOneFile(root, file, relativePath, summary);
                } catch (Exception e) {
                    summary.failedFiles++;
                    summary.failures.add(new LegalIngestionSummary.FailureDetail(relativePath, e.getMessage()));
                    log.warn("Document failed: {} — {}", relativePath, e.getMessage());
                    persistFailure(relativePath, file, e.getMessage());
                }
            }

            log.info("Legal ingestion completed");
            return summary;
        } finally {
            running.set(false);
        }
    }

    public boolean isRunning() {
        return running.get();
    }

    private void processOneFile(Path root, Path file, String relativePath, LegalIngestionSummary summary) throws Exception {
        byte[] bytes = Files.readAllBytes(file);
        String contentHash = sha256Hex(bytes);
        String sourceDocumentId = sha256Hex(relativePath.getBytes(StandardCharsets.UTF_8));

        Optional<LegalSourceDocument> existingOpt = sourceDocRepo.findBySourceDocumentId(sourceDocumentId);
        if (existingOpt.isPresent() && contentHash.equals(existingOpt.get().getContentHash())
                && existingOpt.get().getStatus() == LegalIngestionStatus.INDEXED) {
            log.info("Document unchanged - skipped: {}", relativePath);
            summary.skippedFiles++;
            return;
        }

        if (existingOpt.isPresent()) {
            chunkRepo.deleteBySourceDocumentId(sourceDocumentId);
        }

        LegalSourceDocument record = existingOpt.orElseGet(LegalSourceDocument::new);
        String[] pathParts = relativePath.split("/");
        String immediateFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";
        String topLevelFolder = pathParts.length > 1 ? pathParts[0] : "General";
        String folderHierarchy = pathParts.length > 1
                ? String.join(" > ", java.util.Arrays.copyOf(pathParts, pathParts.length - 1))
                : "";
        String ext = extractor.extensionOf(file);
        String title = deriveTitle(file);

        record.setSourceDocumentId(sourceDocumentId);
        record.setOriginalFilename(file.getFileName().toString());
        record.setDocumentTitle(title);
        record.setDocumentType(topLevelFolder);
        record.setFileExtension(ext);
        record.setRelativeSourcePath(relativePath);
        record.setSourceFolder(immediateFolder);
        record.setFolderHierarchy(folderHierarchy);
        record.setFileSize((long) bytes.length);
        record.setLastModified(LocalDateTime.ofInstant(Files.getLastModifiedTime(file).toInstant(), ZoneId.systemDefault()));
        record.setContentHash(contentHash);
        record.setFailureReason(null);

        ExtractedDocumentText extracted;
        try {
            extracted = extractor.extract(file);
        } catch (Exception e) {
            record.setStatus(LegalIngestionStatus.FAILED);
            record.setFailureReason("Text extraction failed: " + e.getMessage());
            sourceDocRepo.save(record);
            throw e;
        }

        if (extracted.isRequiresOcr()) {
            record.setStatus(LegalIngestionStatus.REQUIRES_OCR);
            record.setRequiresOcr(true);
            record.setIngestionTimestamp(LocalDateTime.now());
            sourceDocRepo.save(record);
            summary.ocrRequired++;
            summary.ocrRequiredFiles.add(relativePath);
            log.info("Document requires OCR — no extractable text: {}", relativePath);
            return;
        }

        List<String> pages = extracted.hasPages() ? extracted.getPages() : List.of(extracted.getFullText());
        List<LegalAwareChunker.Chunk> chunks = chunker.chunk(pages, properties.getChunkSizeChars(), properties.getChunkOverlapChars());

        if (chunks.isEmpty()) {
            record.setStatus(LegalIngestionStatus.REQUIRES_OCR);
            record.setRequiresOcr(true);
            sourceDocRepo.save(record);
            summary.ocrRequired++;
            summary.ocrRequiredFiles.add(relativePath);
            log.info("Document produced no usable chunks — treating as requires-OCR: {}", relativePath);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        int chunkNumber = 0;
        for (LegalAwareChunker.Chunk c : chunks) {
            chunkNumber++;
            List<Float> embedding = embeddingProvider.embed(c.text);
            summary.embeddingsGenerated++;

            LegalDocumentChunk row = new LegalDocumentChunk();
            row.setSourceDocumentId(sourceDocumentId);
            row.setContentHash(contentHash);
            row.setOriginalFilename(file.getFileName().toString());
            row.setDocumentTitle(title);
            row.setDocumentType(topLevelFolder);
            row.setRelativeSourcePath(relativePath);
            row.setSourceFolder(immediateFolder);
            row.setFolderHierarchy(folderHierarchy);
            row.setChunkNumber(chunkNumber);
            row.setTotalChunks(chunks.size());
            row.setPageNumber(c.pageNumber);
            row.setLegalSection(c.legalSection);
            row.setChunkText(c.text);
            row.setEmbedding(toJsonArray(embedding));
            row.setIngestionTimestamp(now);
            chunkRepo.save(row);
            summary.vectorsStored++;
        }
        summary.chunksCreated += chunks.size();

        record.setStatus(LegalIngestionStatus.INDEXED);
        record.setRequiresOcr(false);
        record.setTotalChunks(chunks.size());
        record.setIngestionTimestamp(now);
        sourceDocRepo.save(record);
        summary.processedFiles++;
        log.info("Document indexed: {} ({} chunks)", relativePath, chunks.size());
    }

    private void persistFailure(String relativePath, Path file, String reason) {
        try {
            String sourceDocumentId = sha256Hex(relativePath.getBytes(StandardCharsets.UTF_8));
            LegalSourceDocument record = sourceDocRepo.findBySourceDocumentId(sourceDocumentId)
                    .orElseGet(LegalSourceDocument::new);
            record.setSourceDocumentId(sourceDocumentId);
            record.setOriginalFilename(file.getFileName().toString());
            record.setRelativeSourcePath(relativePath);
            record.setStatus(LegalIngestionStatus.FAILED);
            record.setFailureReason(reason);
            sourceDocRepo.save(record);
        } catch (Exception ignored) {

        }
    }

    private String deriveTitle(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        return base.replace('_', ' ').replace('-', ' ').trim();
    }

    private String toJsonArray(List<Float> values) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(values.get(i));
        }
        return sb.append(']').toString();
    }

    private String sha256Hex(byte[] data) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
