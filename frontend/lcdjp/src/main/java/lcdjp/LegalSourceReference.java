package lcdjp;

public class LegalSourceReference {

    private String documentTitle;
    private String legalSection;
    private Integer pageNumber;
    private String relativeSourcePath;

    public LegalSourceReference() {}

    public LegalSourceReference(String documentTitle, String legalSection,
                                 Integer pageNumber, String relativeSourcePath) {
        this.documentTitle = documentTitle;
        this.legalSection = legalSection;
        this.pageNumber = pageNumber;
        this.relativeSourcePath = relativeSourcePath;
    }

    public String getDocumentTitle() { return documentTitle; }
    public void setDocumentTitle(String documentTitle) { this.documentTitle = documentTitle; }
    public String getLegalSection() { return legalSection; }
    public void setLegalSection(String legalSection) { this.legalSection = legalSection; }
    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }
    public String getRelativeSourcePath() { return relativeSourcePath; }
    public void setRelativeSourcePath(String relativeSourcePath) { this.relativeSourcePath = relativeSourcePath; }
}
