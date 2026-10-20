package lcdjp.legal;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "legal_source_documents",
        uniqueConstraints = @UniqueConstraint(columnNames = "relative_source_path"))
@Data
public class LegalSourceDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_document_id", nullable = false, unique = true, length = 128)
    private String sourceDocumentId;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "document_title")
    private String documentTitle;

    @Column(name = "document_type", length = 32)
    private String documentType;

    @Column(name = "file_extension", length = 16)
    private String fileExtension;

    @Column(name = "relative_source_path", nullable = false, length = 1024)
    private String relativeSourcePath;

    @Column(name = "source_folder")
    private String sourceFolder;

    @Column(name = "folder_hierarchy", length = 1024)
    private String folderHierarchy;

    private Long fileSize;

    @Column(name = "last_modified")
    private LocalDateTime lastModified;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "ingestion_timestamp")
    private LocalDateTime ingestionTimestamp;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private LegalIngestionStatus status = LegalIngestionStatus.PENDING;

    @Column(name = "requires_ocr")
    private boolean requiresOcr;

    @Column(name = "total_chunks")
    private int totalChunks;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;
}
