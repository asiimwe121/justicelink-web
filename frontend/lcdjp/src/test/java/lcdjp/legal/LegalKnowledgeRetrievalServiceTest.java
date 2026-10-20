package lcdjp.legal;

import lcdjp.ai.EmbeddingProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LegalKnowledgeRetrievalServiceTest {

    private LegalDocumentChunkRepository repo;
    private EmbeddingProvider embeddings;
    private LegalKnowledgeRetrievalService service;
    private List<LegalDocumentChunk> stored;

    private static LegalDocumentChunk chunk(long id, String title, String embeddingJson) {
        LegalDocumentChunk c = new LegalDocumentChunk();
        c.setId(id);
        c.setDocumentTitle(title);
        c.setChunkText("text of " + title);
        c.setChunkNumber((int) id);
        c.setEmbedding(embeddingJson);
        return c;
    }

    @BeforeEach
    void setUp() throws Exception {
        repo = mock(LegalDocumentChunkRepository.class);
        embeddings = mock(EmbeddingProvider.class);
        service = new LegalKnowledgeRetrievalService(repo, embeddings);

        stored = new ArrayList<>(List.of(
                chunk(1, "Penal Code", "[1.0, 0.0]"),
                chunk(2, "Land Act", "[0.0, 1.0]"),
                chunk(3, "Evidence Act", "[0.7, 0.7]")));
        syncRepo();
        when(embeddings.embed(anyString())).thenReturn(List.of(1.0f, 0.0f));
    }

    private static String anyString() {
        return org.mockito.ArgumentMatchers.anyString();
    }

    @SuppressWarnings("unchecked")
    private void syncRepo() {
        when(repo.findIdAndEmbedding()).thenAnswer(inv -> {
            List<LegalDocumentChunkRepository.IdAndEmbedding> rows = new ArrayList<>();
            for (LegalDocumentChunk c : stored) {
                rows.add(new LegalDocumentChunkRepository.IdAndEmbedding() {
                    @Override public Long getId() { return c.getId(); }
                    @Override public String getEmbedding() { return c.getEmbedding(); }
                });
            }
            return rows;
        });
        when(repo.count()).thenAnswer(inv -> (long) stored.size());
        when(repo.findMaxId()).thenAnswer(inv ->
                stored.stream().mapToLong(LegalDocumentChunk::getId).max().orElse(0L));
        when(repo.findAllById(any())).thenAnswer(inv -> {
            Iterable<Long> ids = inv.getArgument(0);
            List<LegalDocumentChunk> out = new ArrayList<>();
            for (Long id : ids) {
                stored.stream().filter(c -> c.getId().equals(id)).findFirst().ifPresent(out::add);
            }
            return out;
        });
    }

    @Test
    void returnsTheClosestChunksFirstAndLimitsToTopK() throws Exception {
        List<LegalKnowledgeRetrievalService.RetrievedChunk> results = service.search("theft", 2);

        assertEquals(2, results.size());
        assertEquals("Penal Code", results.get(0).documentTitle);
        assertEquals("Evidence Act", results.get(1).documentTitle);
        assertEquals("text of Penal Code", results.get(0).chunkText);
        assertTrue(results.get(0).score > results.get(1).score);
    }

    @Test
    void reusesTheIndexWhenTheCorpusHasNotChanged() throws Exception {
        service.search("one", 2);
        service.search("two", 2);
        service.search("three", 2);

        verify(repo, times(1)).findIdAndEmbedding();
    }

    @Test
    void rebuildsTheIndexWhenAChunkIsAdded() throws Exception {
        service.search("before", 3);
        stored.add(chunk(4, "Constitution", "[1.0, 0.1]"));

        List<LegalKnowledgeRetrievalService.RetrievedChunk> results = service.search("after", 4);

        verify(repo, times(2)).findIdAndEmbedding();
        assertEquals(4, results.size());
        assertTrue(results.stream().anyMatch(r -> "Constitution".equals(r.documentTitle)));
    }

    @Test
    void rebuildsTheIndexWhenAChunkIsDeleted() throws Exception {
        service.search("before", 3);
        stored.removeIf(c -> c.getId() == 1L);

        List<LegalKnowledgeRetrievalService.RetrievedChunk> results = service.search("after", 3);

        verify(repo, times(2)).findIdAndEmbedding();
        assertTrue(results.stream().noneMatch(r -> "Penal Code".equals(r.documentTitle)));
    }

    @Test
    void chunksWithMismatchedOrEmptyEmbeddingsRankLast() throws Exception {
        stored.add(chunk(5, "Broken", "[]"));
        stored.add(chunk(6, "Wrong size", "[1.0, 0.0, 0.0]"));

        List<LegalKnowledgeRetrievalService.RetrievedChunk> results = service.search("q", 5);

        assertEquals(5, results.size());
        assertEquals("Penal Code", results.get(0).documentTitle);
        assertEquals(-1.0, results.get(3).score);
        assertEquals(-1.0, results.get(4).score);
    }

    @Test
    void nonPositiveTopKReturnsNothing() throws Exception {
        assertTrue(service.search("q", 0).isEmpty());
    }
}
