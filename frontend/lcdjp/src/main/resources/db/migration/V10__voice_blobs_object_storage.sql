-- Voice recordings can now live in object storage instead of the voice_blobs.data column.
-- object_key is set (and data left NULL) when a recording is stored in the bucket; rows written
-- before this migration, or while object storage is switched off, keep their bytes in data.
ALTER TABLE voice_blobs
    ADD COLUMN object_key VARCHAR(255) NULL AFTER size_bytes,
    MODIFY COLUMN data LONGBLOB NULL;
