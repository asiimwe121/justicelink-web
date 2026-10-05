package lcdjp;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RequestSizeLimitFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RequestSizeLimitFilter.class);

    @Value("${app.max-request-body-bytes:15728640}")
    private long maxBodyBytes;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        long contentLength = request.getContentLengthLong();
        if (contentLength > maxBodyBytes) {
            rejectTooLarge(request, response, contentLength);
            return;
        }

        try {
            filterChain.doFilter(new SizeLimitedRequestWrapper(request, maxBodyBytes), response);
        } catch (RequestTooLargeException e) {
            rejectTooLarge(request, response, -1);
        }
    }

    private void rejectTooLarge(HttpServletRequest request, HttpServletResponse response, long declaredLength)
            throws IOException {
        logger.warn("Rejected oversized request body: {} (Content-Length={}, limit={})",
                request.getRequestURI(), declaredLength, maxBodyBytes);
        response.setStatus(413);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Request body too large\"}");
    }

    private static class RequestTooLargeException extends IOException {
        RequestTooLargeException() {
            super("Request body exceeded the configured size limit");
        }
    }

    private static class SizeLimitedRequestWrapper extends HttpServletRequestWrapper {

        private final long limit;
        private final ServletInputStream delegate;

        SizeLimitedRequestWrapper(HttpServletRequest request, long limit) throws IOException {
            super(request);
            this.limit = limit;
            this.delegate = request.getInputStream();
        }

        @Override
        public ServletInputStream getInputStream() {
            return new ServletInputStream() {
                private long totalRead = 0;

                @Override
                public boolean isFinished() {
                    return delegate.isFinished();
                }

                @Override
                public boolean isReady() {
                    return delegate.isReady();
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    delegate.setReadListener(readListener);
                }

                @Override
                public int read() throws IOException {
                    int b = delegate.read();
                    if (b != -1) {
                        totalRead++;
                        checkLimit();
                    }
                    return b;
                }

                @Override
                public int read(byte[] b, int off, int len) throws IOException {
                    int n = delegate.read(b, off, len);
                    if (n > 0) {
                        totalRead += n;
                        checkLimit();
                    }
                    return n;
                }

                private void checkLimit() throws IOException {
                    if (totalRead > limit) {
                        throw new RequestTooLargeException();
                    }
                }
            };
        }
    }
}
