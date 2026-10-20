package lcdjp.storage;

import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Server-side checks for document uploads. The browser sends the file as a data URL
 * ("data:image/png;base64,...") inside JSON, and its own claims about type and size cannot be trusted.
 * This works out the real size from the payload, resolves the type from the data URL (or the file
 * extension when the browser sent none), enforces an allowlist, and checks the first bytes of the
 * file types that have a well-known signature.
 */
final class DocumentUploadValidator {

    /**
     * Largest decoded file accepted (the request body limit is larger because base64 adds about 33%).
     * Phone photos are shrunk in the browser before upload, so 5 MB leaves room for scanned PDFs and Word files.
     */
    static final long MAX_DECODED_BYTES = 5L * 1024 * 1024;

    private static final Set<String> ALLOWED_MIME = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
            "text/plain",
            "audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave",
            "video/mp4");

    private static final Map<String, String> MIME_BY_EXTENSION = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("png", "image/png"),
            Map.entry("gif", "image/gif"),
            Map.entry("webp", "image/webp"),
            Map.entry("heic", "image/heic"),
            Map.entry("heif", "image/heif"),
            Map.entry("txt", "text/plain"),
            Map.entry("mp3", "audio/mpeg"),
            Map.entry("wav", "audio/wav"),
            Map.entry("mp4", "video/mp4"));

    /** The verified type and the real decoded size, to store instead of what the client claimed. */
    record Result(String mimeType, long sizeBytes) {
    }

    /** Thrown with a message that is safe to show to the person uploading. */
    static final class InvalidUploadException extends RuntimeException {
        InvalidUploadException(String message) {
            super(message);
        }
    }

    private DocumentUploadValidator() {
    }

    static Result validate(String fileName, String fileData) {
        if (fileData == null || fileData.isBlank()) {
            throw new InvalidUploadException("file_data is required");
        }

        String declaredMime = "";
        String payload = fileData;
        if (fileData.startsWith("data:")) {
            int comma = fileData.indexOf(',');
            if (comma < 0) {
                throw new InvalidUploadException("file_data is not a valid data URL");
            }
            String header = fileData.substring(5, comma).toLowerCase(Locale.ROOT);
            if (!header.contains(";base64")) {
                throw new InvalidUploadException("file_data must be base64 encoded");
            }
            int semi = header.indexOf(';');
            declaredMime = (semi >= 0 ? header.substring(0, semi) : header).trim();
            payload = fileData.substring(comma + 1);
        }

        String mime = resolveMime(declaredMime, fileName);
        if (!ALLOWED_MIME.contains(mime)) {
            throw new InvalidUploadException("This file type is not allowed");
        }

        long size = decodedSize(payload);
        if (size <= 0) {
            throw new InvalidUploadException("The file is empty");
        }
        if (size > MAX_DECODED_BYTES) {
            throw new InvalidUploadException("The file is too large (maximum "
                    + (MAX_DECODED_BYTES / (1024 * 1024)) + " MB)");
        }

        byte[] head = decodeHead(payload);
        if (!matchesSignature(mime, head)) {
            throw new InvalidUploadException("The file content does not match its type");
        }
        return new Result(mime, size);
    }

    private static String resolveMime(String declaredMime, String fileName) {
        boolean unknown = declaredMime == null || declaredMime.isBlank()
                || "application/octet-stream".equals(declaredMime);
        if (!unknown) {
            return declaredMime;
        }
        if (fileName != null) {
            int dot = fileName.lastIndexOf('.');
            if (dot >= 0 && dot < fileName.length() - 1) {
                String byExtension = MIME_BY_EXTENSION.get(fileName.substring(dot + 1).toLowerCase(Locale.ROOT));
                if (byExtension != null) {
                    return byExtension;
                }
            }
        }
        return "application/octet-stream";
    }

    /** Decoded size computed from the base64 length, without decoding the whole file. */
    private static long decodedSize(String payload) {
        int len = payload.length();
        if (len == 0 || len % 4 != 0) {
            throw new InvalidUploadException("file_data is not valid base64");
        }
        int padding = 0;
        if (payload.charAt(len - 1) == '=') padding++;
        if (len > 1 && payload.charAt(len - 2) == '=') padding++;
        return (long) len / 4 * 3 - padding;
    }

    /** First bytes of the file, enough to check a signature. */
    private static byte[] decodeHead(String payload) {
        String slice = payload.substring(0, Math.min(payload.length(), 16));
        try {
            return Base64.getDecoder().decode(slice);
        } catch (IllegalArgumentException e) {
            throw new InvalidUploadException("file_data is not valid base64");
        }
    }

    private static boolean matchesSignature(String mime, byte[] head) {
        switch (mime) {
            case "application/pdf":
                return startsWith(head, '%', 'P', 'D', 'F');
            case "image/png":
                return startsWith(head, 0x89, 'P', 'N', 'G');
            case "image/jpeg":
                return startsWith(head, 0xFF, 0xD8, 0xFF);
            case "image/gif":
                return startsWith(head, 'G', 'I', 'F', '8');
            default:
                return true;
        }
    }

    private static boolean startsWith(byte[] head, int... expected) {
        if (head.length < expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((head[i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }
}
