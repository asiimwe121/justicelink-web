package lcdjp;
import lombok.Data;
@Data
public class AdminOnlineRequest {
    private Boolean isOnline;
    private Boolean online;
    public boolean requestedOnline() {
        return Boolean.TRUE.equals(isOnline != null ? isOnline : online);
    }
}
