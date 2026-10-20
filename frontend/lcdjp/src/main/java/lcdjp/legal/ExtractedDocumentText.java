package lcdjp.legal;

import java.util.List;

public class ExtractedDocumentText {

    private String fullText;

    private List<String> pages;

    private boolean requiresOcr;

    public static ExtractedDocumentText ofFullText(String fullText) {
        ExtractedDocumentText r = new ExtractedDocumentText();
        r.fullText = fullText;
        return r;
    }

    public static ExtractedDocumentText ofPages(List<String> pages) {
        ExtractedDocumentText r = new ExtractedDocumentText();
        r.pages = pages;
        r.fullText = String.join("\n\n", pages);
        return r;
    }

    public static ExtractedDocumentText requiresOcr() {
        ExtractedDocumentText r = new ExtractedDocumentText();
        r.requiresOcr = true;
        return r;
    }

    public String getFullText() { return fullText; }
    public List<String> getPages() { return pages; }
    public boolean isRequiresOcr() { return requiresOcr; }
    public boolean hasPages() { return pages != null && !pages.isEmpty(); }
}
