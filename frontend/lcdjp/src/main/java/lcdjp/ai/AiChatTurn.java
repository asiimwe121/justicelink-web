package lcdjp.ai;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

public class AiChatTurn {
    private String role;
    private String content;

    public AiChatTurn() {}

    public AiChatTurn(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
