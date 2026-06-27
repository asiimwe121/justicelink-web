package lcdjp;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.io.IOException;
import java.nio.file.Files;

@RestController
public class TestController {

    @GetMapping("/")
    public String home() {
        return "LCDJP Backend is Running";
    }

    @GetMapping(value = "/index.html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getIndex() throws IOException {
        Resource resource = new ClassPathResource("static/index.html");
        String content = new String(Files.readAllBytes(resource.getFile().toPath()));
        return ResponseEntity.ok(content);
    }

    @GetMapping("/login")
    public String loginPage() {
        return "forward:/index.html";
    }
}