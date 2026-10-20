package lcdjp.storage;

import lombok.Data;

@Data
public class UnshareDocumentRequest {
    private String removeUser;
    private String shared_with;
}
