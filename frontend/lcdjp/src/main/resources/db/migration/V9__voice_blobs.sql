-- Voice recordings move out of LONGTEXT base64 columns into real binary storage.
-- The old columns (chat_messages.audio_data, cases.voice_statement,
-- cases.voice_note_data) stay in place and now hold a short reference such as
-- "/api/voice/42". Rows written before this migration keep their base64 data URI
-- and continue to play; they are converted by the optional backfill runner.
CREATE TABLE voice_blobs (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    kind           VARCHAR(20)  NOT NULL,          -- CHAT | CASE_STATEMENT | CASE_NOTE
    uploader       VARCHAR(255) NOT NULL,
    recipient      VARCHAR(255) NULL,              -- CHAT only
    case_reference VARCHAR(255) NULL,              -- CASE_* only
    mime_type      VARCHAR(100) NOT NULL,
    size_bytes     INT          NOT NULL,
    data           LONGBLOB     NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_voice_blobs_case ON voice_blobs (case_reference);
CREATE INDEX idx_voice_blobs_uploader ON voice_blobs (uploader);
CREATE INDEX idx_voice_blobs_recipient ON voice_blobs (recipient);
