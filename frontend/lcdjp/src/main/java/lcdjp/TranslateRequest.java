package lcdjp;

import java.util.List;

public class TranslateRequest {

    private List<String> texts;
    private String target;

    public List<String> getTexts() {
        return texts;
    }

    public void setTexts(List<String> texts) {
        this.texts = texts;
    }

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target;
    }
}
