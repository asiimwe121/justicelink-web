package lcdjp.legal;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class LegalDocumentTextExtractor {

    public static final Set<String> SUPPORTED_EXTENSIONS = Set.of("pdf", "docx", "txt");

    private static final int OCR_THRESHOLD_CHARS = 20;

    public String extensionOf(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
    }

    public boolean isSupported(Path file) {
        return SUPPORTED_EXTENSIONS.contains(extensionOf(file));
    }

    public ExtractedDocumentText extract(Path file) throws Exception {
        String ext = extensionOf(file);
        switch (ext) {
            case "pdf":  return extractPdf(file);
            case "docx": return extractDocx(file);
            case "txt":  return extractTxt(file);
            default:
                throw new IllegalArgumentException("Unsupported file extension: " + ext);
        }
    }

    private ExtractedDocumentText extractPdf(Path file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            int pageCount = doc.getNumberOfPages();
            List<String> pages = new ArrayList<>(pageCount);
            int totalChars = 0;
            for (int i = 1; i <= pageCount; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String pageText = stripper.getText(doc);
                pages.add(pageText == null ? "" : pageText.trim());
                totalChars += pages.get(pages.size() - 1).length();
            }
            if (totalChars < OCR_THRESHOLD_CHARS) {
                return ExtractedDocumentText.requiresOcr();
            }
            return ExtractedDocumentText.ofPages(pages);
        }
    }
    private ExtractedDocumentText extractDocx(Path file) throws IOException {
        try (InputStream is = Files.newInputStream(file);
             XWPFDocument doc = new XWPFDocument(is)) {
            StringBuilder sb = new StringBuilder();
            for (XWPFParagraph p : doc.getParagraphs()) {
                String text = p.getText();
                if (text != null && !text.isBlank()) {
                    sb.append(text).append("\n");
                }
            }
            String full = sb.toString().trim();
            if (full.length() < OCR_THRESHOLD_CHARS) {

                return ExtractedDocumentText.requiresOcr();
            }
            return ExtractedDocumentText.ofFullText(full);
        }
    }

    private ExtractedDocumentText extractTxt(Path file) throws IOException {
        byte[] bytes = Files.readAllBytes(file);
        String text = decodeStrict(bytes, StandardCharsets.UTF_8);
        if (text == null) {

            text = new String(bytes, StandardCharsets.ISO_8859_1);
        }
        if (text.trim().length() < OCR_THRESHOLD_CHARS) {
            return ExtractedDocumentText.requiresOcr();
        }
        return ExtractedDocumentText.ofFullText(text.trim());
    }

    private String decodeStrict(byte[] bytes, java.nio.charset.Charset charset) {
        try {
            return charset.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(java.nio.ByteBuffer.wrap(bytes))
                    .toString();
        } catch (CharacterCodingException e) {
            return null;
        }
    }
}
