package lcdjp.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CacheServiceTest {

    @Test
    void storesAndExpiresEntries() throws Exception {
        CacheService cache = new CacheService();
        cache.put("a", "x", 20);
        assertEquals("x", cache.get("a").orElseThrow());
        Thread.sleep(40);
        assertTrue(cache.get("a").isEmpty());
    }

    @Test
    void neverGrowsPastTheLimit() {
        CacheService cache = new CacheService();
        for (int i = 0; i < CacheService.MAX_ENTRIES + 500; i++) {
            cache.put("k" + i, i, 60_000);
        }
        assertTrue(cache.getSize() <= CacheService.MAX_ENTRIES);
        assertTrue(cache.get("k" + (CacheService.MAX_ENTRIES + 499)).isPresent());
    }
}
