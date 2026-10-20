package lcdjp.lcinvite;

import org.springframework.http.HttpStatus;

/** A problem the person (or admin) can fix, with the HTTP status and message to show them. */
public class LcInviteException extends RuntimeException {

    private final HttpStatus status;

    public LcInviteException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
