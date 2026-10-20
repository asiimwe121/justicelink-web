package lcdjp.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestSizeLimitFilterTest {

    private RequestSizeLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RequestSizeLimitFilter();
        ReflectionTestUtils.setField(filter, "maxBodyBytes", 100L);
    }

    @Test
    void declaredLengthOverTheLimitIsRejectedBeforeTheChainRuns() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/cases");
        request.setContent(new byte[101]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainRan = new AtomicBoolean(false);
        FilterChain chain = (req, res) -> chainRan.set(true);

        filter.doFilter(request, response, chain);

        assertEquals(413, response.getStatus());
        assertFalse(chainRan.get());
        assertTrue(response.getContentAsString().contains("too large"));
    }

    @Test
    void bodyWithinTheLimitPassesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/cases");
        request.setContent(new byte[100]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainRan = new AtomicBoolean(false);
        FilterChain chain = (req, res) -> {
            req.getInputStream().readAllBytes();
            chainRan.set(true);
        };

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertTrue(chainRan.get());
    }

    @Test
    void bodyThatLiesAboutItsLengthIsCutOffWhileItIsRead() throws Exception {
        // No usable Content-Length (like a chunked upload): the limit must still hold while the body is read.
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/cases") {
            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        request.setContent(new byte[500]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> req.getInputStream().readAllBytes();

        filter.doFilter(request, response, chain);

        assertEquals(413, response.getStatus());
    }
}
