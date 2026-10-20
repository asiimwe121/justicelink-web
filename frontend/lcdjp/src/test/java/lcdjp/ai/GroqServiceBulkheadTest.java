package lcdjp.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GroqServiceBulkheadTest {

    private GroqService service(int maxConcurrent) {
        GroqService service = new GroqService(new GroqProperties());
        service.setMaxConcurrent(maxConcurrent);
        return service;
    }

    @Test
    void chatReturnsNullStraightAwayWhenTooManyCallsAreInFlight() {
        GroqService service = service(1);
        assertTrue(service.bulkhead().tryAcquire()); // someone else is already waiting on the provider

        // Null is what callers already turn into the friendly fallback reply.
        assertNull(service.chat(new AiChatRequest()));
        assertEquals(0, service.bulkhead().available(), "the rejected call must not free the other caller's slot");
    }

    @Test
    void chatReleasesItsSlotWhenTheCallEnds() {
        GroqService service = service(2);

        // No API key is configured in this test, so the call ends quickly with null.
        assertNull(service.chat(new AiChatRequest()));

        assertEquals(2, service.bulkhead().available());
    }

    @Test
    void capComesFromTheConfiguredValue() {
        assertEquals(3, service(3).bulkhead().maxConcurrent());
        assertEquals(1, service(0).bulkhead().maxConcurrent(), "a zero or negative setting is raised to 1");
    }
}
