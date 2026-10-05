package lcdjp;

import java.util.List;

public interface EmbeddingProvider {
    List<Float> embed(String text) throws Exception;
}
