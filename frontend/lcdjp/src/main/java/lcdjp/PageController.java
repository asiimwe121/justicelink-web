package lcdjp;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.ResponseEntity;

@Controller
public class PageController {

    @GetMapping("/")
    public String index() {
        return "forward:/index.html";
    }

    @GetMapping("/login")
    public String login() {

        return "forward:/index.html";
    }

    @GetMapping("/home")
    public String home() {
        return "forward:/index.html";
    }

    @GetMapping("/app")
    public String app() {
        return "forward:/index.html";
    }

    @GetMapping("/favicon.ico")
    public ResponseEntity<Void> favicon() {

        return ResponseEntity.noContent().build();
    }
}