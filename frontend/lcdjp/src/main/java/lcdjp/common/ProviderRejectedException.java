package lcdjp.common;

/**
 * The provider is up and answered, but refused this particular request (a mistyped email address,
 * an SMS number it will not send to, bad credentials). It says nothing about whether the provider
 * is healthy, so {@link OutboundGuard} never retries it and never counts it toward opening the circuit.
 *
 * <p>Extends {@link IllegalStateException} so existing callers that catch it keep working.
 */
public class ProviderRejectedException extends IllegalStateException {

    private final int status;
    private final String body;

    public ProviderRejectedException(String message) {
        this(message, 0, null);
    }

    public ProviderRejectedException(String message, int status, String body) {
        super(message);
        this.status = status;
        this.body = body;
    }

    /** HTTP status, or 0 when not an HTTP rejection. */
    public int getStatus() {
        return status;
    }

    /** Response body the provider sent with the rejection, may be null. */
    public String getBody() {
        return body;
    }
}
