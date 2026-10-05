package lcdjp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

@Service
public class LegalKnowledgeRetrievalService {

    private static final Logger log = LoggerFactory.getLogger(LegalKnowledgeRetrievalService.class);

    public static class RetrievedChunk {
        public String documentTitle;
        public String relativeSourcePath;
        public String legalSection;
        public Integer pageNumber;
        public int chunkNumber;
        public String chunkText;
        public double score;
    }

    private static final class VectorIndex {
        final long chunkCount;
        final long maxId;
        final long[] ids;
        final float[][] vectors;
        final double[] norms;

        VectorIndex(long chunkCount, long maxId, long[] ids, float[][] vectors, double[] norms) {
            this.chunkCount = chunkCount;
            this.maxId = maxId;
            this.ids = ids;
            this.vectors = vectors;
            this.norms = norms;
        }
    }

    private final LegalDocumentChunkRepository chunkRepo;
    private final EmbeddingProvider embeddingProvider;

    private volatile VectorIndex index;
    private final Object rebuildLock = new Object();

    public LegalKnowledgeRetrievalService(LegalDocumentChunkRepository chunkRepo, EmbeddingProvider embeddingProvider) {
        this.chunkRepo = chunkRepo;
        this.embeddingProvider = embeddingProvider;
    }

    public List<RetrievedChunk> search(String query, int topK) throws Exception {
        List<Float> queryList = embeddingProvider.embed(query);
        if (topK <= 0) {
            return List.of();
        }

        float[] queryVector = toArray(queryList);
        double queryNorm = norm(queryVector);
        VectorIndex idx = currentIndex();

        int n = idx.ids.length;
        double[] scores = new double[n];
        PriorityQueue<Integer> heap = new PriorityQueue<>(topK + 1, (a, b) -> Double.compare(scores[a], scores[b]));
        for (int i = 0; i < n; i++) {
            scores[i] = cosine(queryVector, queryNorm, idx.vectors[i], idx.norms[i]);
            heap.add(i);
            if (heap.size() > topK) {
                heap.poll();
            }
        }

        List<Integer> best = new ArrayList<>(heap);
        best.sort((a, b) -> Double.compare(scores[b], scores[a]));

        List<Long> ids = new ArrayList<>(best.size());
        for (int pos : best) {
            ids.add(idx.ids[pos]);
        }
        Map<Long, LegalDocumentChunk> byId = new HashMap<>();
        for (LegalDocumentChunk c : chunkRepo.findAllById(ids)) {
            byId.put(c.getId(), c);
        }

        List<RetrievedChunk> results = new ArrayList<>(best.size());
        for (int pos : best) {
            LegalDocumentChunk c = byId.get(idx.ids[pos]);
            if (c == null) {
                continue;
            }
            RetrievedChunk r = new RetrievedChunk();
            r.documentTitle = c.getDocumentTitle();
            r.relativeSourcePath = c.getRelativeSourcePath();
            r.legalSection = c.getLegalSection();
            r.pageNumber = c.getPageNumber();
            r.chunkNumber = c.getChunkNumber();
            r.chunkText = c.getChunkText();
            r.score = scores[pos];
            results.add(r);
        }
        return results;
    }

    private VectorIndex currentIndex() {
        long count = chunkRepo.count();
        long maxId = chunkRepo.findMaxId();
        VectorIndex existing = index;
        if (existing != null && existing.chunkCount == count && existing.maxId == maxId) {
            return existing;
        }
        synchronized (rebuildLock) {
            existing = index;
            if (existing != null && existing.chunkCount == count && existing.maxId == maxId) {
                return existing;
            }
            VectorIndex rebuilt = buildIndex();
            index = rebuilt;
            return rebuilt;
        }
    }

    private VectorIndex buildIndex() {
        List<LegalDocumentChunk> all = chunkRepo.findAll();
        int n = all.size();
        long[] ids = new long[n];
        float[][] vectors = new float[n][];
        double[] norms = new double[n];
        long maxId = 0;
        for (int i = 0; i < n; i++) {
            LegalDocumentChunk c = all.get(i);
            ids[i] = c.getId();
            vectors[i] = parseEmbedding(c.getEmbedding());
            norms[i] = norm(vectors[i]);
            maxId = Math.max(maxId, ids[i]);
        }
        log.info("Legal vector index rebuilt: {} chunks", n);
        return new VectorIndex(n, maxId, ids, vectors, norms);
    }

    private static float[] parseEmbedding(String json) {
        if (json == null) return new float[0];
        String stripped = json.replaceAll("[\\[\\]\\s]", "");
        if (stripped.isEmpty()) return new float[0];
        String[] parts = stripped.split(",");
        float[] values = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            values[i] = Float.parseFloat(parts[i]);
        }
        return values;
    }

    private static float[] toArray(List<Float> list) {
        float[] out = new float[list.size()];
        for (int i = 0; i < out.length; i++) {
            out[i] = list.get(i);
        }
        return out;
    }

    private static double norm(float[] v) {
        double sum = 0;
        for (float x : v) {
            sum += (double) x * x;
        }
        return Math.sqrt(sum);
    }

    private static double cosine(float[] a, double normA, float[] b, double normB) {
        if (a.length == 0 || b.length == 0 || a.length != b.length) return -1.0;
        if (normA == 0 || normB == 0) return -1.0;
        double dot = 0;
        for (int i = 0; i < a.length; i++) {
            dot += (double) a[i] * b[i];
        }
        return dot / (normA * normB);
    }
}
