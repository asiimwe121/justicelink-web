package lcdjp.storage;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class DocumentUploadValidatorTest {

    private static String b64(byte[] bytes) {
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static final byte[] PDF = "%PDF-1.4 sample content".getBytes();
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

    @Test
    void acceptsAPdfAndReportsItsRealSize() {
        DocumentUploadValidator.Result r = DocumentUploadValidator.validate(
                "contract.pdf", "data:application/pdf;base64," + b64(PDF));
        assertEquals("application/pdf", r.mimeType());
        assertEquals(PDF.length, r.sizeBytes());
    }

    @Test
    void acceptsAPngWithValidSignature() {
        assertEquals("image/png", DocumentUploadValidator.validate(
                "id.png", "data:image/png;base64," + b64(PNG)).mimeType());
    }

    @Test
    void rejectsContentThatDoesNotMatchTheDeclaredType() {
        assertThrows(DocumentUploadValidator.InvalidUploadException.class, () ->
                DocumentUploadValidator.validate("id.png", "data:image/png;base64," + b64(PDF)));
    }

    @Test
    void rejectsSvgAndHtmlBecauseTheyCanCarryScript() {
        assertThrows(DocumentUploadValidator.InvalidUploadException.class, () ->
                DocumentUploadValidator.validate("a.svg", "data:image/svg+xml;base64," + b64("<svg/>".getBytes())));
        assertThrows(DocumentUploadValidator.InvalidUploadException.class, () ->
                DocumentUploadValidator.validate("a.html", "data:text/html;base64," + b64("<script>".getBytes())));
    }

    @Test
    void fallsBackToTheFileExtensionWhenTheBrowserSendsNoType() {
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                DocumentUploadValidator.validate("brief.docx",
                        "data:application/octet-stream;base64," + b64("PK-zip-bytes-here".getBytes())).mimeType());
        assertThrows(DocumentUploadValidator.InvalidUploadException.class, () ->
                DocumentUploadValidator.validate("noextension",
                        "data:application/octet-stream;base64," + b64(PDF)));
    }

    @Test
    void rejectsMissingEmptyAndMalformedPayloads() {
        assertThrows(DocumentUploadValidator.InvalidUploadException.class,
                () -> DocumentUploadValidator.validate("a.pdf", null));
        assertThrows(DocumentUploadValidator.InvalidUploadException.class,
                () -> DocumentUploadValidator.validate("a.pdf", "   "));
        assertThrows(DocumentUploadValidator.InvalidUploadException.class,
                () -> DocumentUploadValidator.validate("a.pdf", "data:application/pdf,notbase64"));
        assertThrows(DocumentUploadValidator.InvalidUploadException.class,
                () -> DocumentUploadValidator.validate("a.txt", "data:text/plain;base64,abc"));
    }

    @Test
    void rejectsFilesOverTheSizeLimit() {
        byte[] big = new byte[(int) DocumentUploadValidator.MAX_DECODED_BYTES + 1024];
        assertThrows(DocumentUploadValidator.InvalidUploadException.class, () ->
                DocumentUploadValidator.validate("big.txt", "data:text/plain;base64," + b64(big)));
    }
}
