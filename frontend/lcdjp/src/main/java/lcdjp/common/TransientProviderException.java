package lcdjp.common;

import java.io.IOException;

/**
 * The provider could not serve the request right now: HTTP 408, 425, 429 or 5xx. These count toward
 * opening the circuit and may be retried where the call allows retries.
 */
public class TransientProviderException extends IOException {

    private final int status;
    private final String body;
    private final long retryAfterMillis;

    public TransientProviderException(String message, int status, String body, long retryAfterMillis) {
        super(message);
        this.status = status;
        this.body = body;
        this.retryAfterMillis = retryAfterMillis;
    }

    public int getStatus() {
        return status;
    }

    public String getBody() {
        return body;
    }

    /** Delay the provider asked for in a Retry-After header, in milliseconds; 0 if none. */
    public long getRetryAfterMillis() {
        return retryAfterMillis;
    }
}
