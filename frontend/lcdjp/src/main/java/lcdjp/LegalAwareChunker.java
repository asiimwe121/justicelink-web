package lcdjp;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class LegalAwareChunker {

    private static final Pattern SECTION_MARKER = Pattern.compile(
            "^\\s*(PART|CHAPTER|SECTION|Section|ARTICLE|Article|SCHEDULE|Schedule|" +
            "REGULATION|Regulation|RULE|Rule|Sub-section|SUBSECTION)\\s+[0-9IVXLCM]+[A-Za-z]?\\b.{0,80}",
            Pattern.MULTILINE);

    public static class Chunk {
        public String text;
        public Integer pageNumber;
        public String legalSection;
    }

    public List<Chunk> chunk(List<String> pages, int targetSizeChars, int overlapChars) {
        List<Chunk> result = new ArrayList<>();
        String currentSection = null;

        for (int pageIdx = 0; pageIdx < pages.size(); pageIdx++) {
            Integer pageNumber = pages.size() > 1 ? pageIdx + 1 : null;
            String pageText = pages.get(pageIdx);
            if (pageText == null || pageText.isBlank()) continue;

            String[] paragraphs = pageText.split("\\r?\\n\\s*\\r?\\n");
            StringBuilder buffer = new StringBuilder();
            String bufferSection = currentSection;

            for (String rawPara : paragraphs) {
                String para = rawPara.trim();
                if (para.isEmpty()) continue;

                Matcher m = SECTION_MARKER.matcher(para);
                if (m.find()) {
                    currentSection = m.group().trim().replaceAll("\\s+", " ");
                    if (currentSection.length() > 80) currentSection = currentSection.substring(0, 80);
                }

                boolean wouldOverflow = buffer.length() > 0
                        && buffer.length() + para.length() + 2 > targetSizeChars;
                boolean paraTooBig = para.length() > targetSizeChars;

                if (wouldOverflow && !paraTooBig) {
                    result.add(buildChunk(buffer.toString(), pageNumber, bufferSection));
                    String tail = tailOverlap(buffer.toString(), overlapChars);
                    buffer.setLength(0);
                    buffer.append(tail);
                    bufferSection = currentSection;
                }

                if (paraTooBig) {

                    if (buffer.length() > 0) {
                        result.add(buildChunk(buffer.toString(), pageNumber, bufferSection));
                        buffer.setLength(0);
                    }
                    for (String piece : hardSplit(para, targetSizeChars, overlapChars)) {
                        result.add(buildChunk(piece, pageNumber, currentSection));
                    }
                    bufferSection = currentSection;
                    continue;
                }

                if (buffer.length() > 0) buffer.append("\n\n");
                buffer.append(para);
            }

            if (buffer.length() > 0) {
                result.add(buildChunk(buffer.toString(), pageNumber, bufferSection));
            }
        }
        return result;
    }

    private Chunk buildChunk(String text, Integer pageNumber, String section) {
        Chunk c = new Chunk();
        c.text = text.trim();
        c.pageNumber = pageNumber;
        c.legalSection = section;
        return c;
    }

    private String tailOverlap(String text, int overlapChars) {
        if (overlapChars <= 0 || text.length() <= overlapChars) return "";
        return text.substring(text.length() - overlapChars);
    }

    private List<String> hardSplit(String text, int size, int overlap) {
        List<String> pieces = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + size, text.length());
            pieces.add(text.substring(start, end));
            if (end == text.length()) break;
            start = end - overlap;
            if (start < 0) start = end;
        }
        return pieces;
    }
}
