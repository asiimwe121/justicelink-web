package lcdjp;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "legal_document_chunks", indexes = {
        @Index(name = "idx_legal_chunk_source_doc", columnList = "source_document_id"),
        @Index(name = "idx_legal_chunk_content_hash", columnList = "content_hash")
})
@Data
public class LegalDocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_document_id", nullable = false, length = 128)
    private String sourceDocumentId;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "document_title")
    private String documentTitle;

    @Column(name = "document_type", length = 32)
    private String documentType;

    @Column(name = "relative_source_path", length = 1024)
    private String relativeSourcePath;

    @Column(name = "source_folder")
    private String sourceFolder;

    @Column(name = "folder_hierarchy", length = 1024)
    private String folderHierarchy;

    @Column(name = "chunk_number")
    private int chunkNumber;

    @Column(name = "total_chunks")
    private int totalChunks;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "legal_section")
    private String legalSection;

    @Lob
    @Column(name = "chunk_text", columnDefinition = "LONGTEXT")
    private String chunkText;

    @Lob
    @Column(name = "embedding", columnDefinition = "LONGTEXT")
    private String embedding;

    @Column(name = "ingestion_timestamp")
    private LocalDateTime ingestionTimestamp;
}
