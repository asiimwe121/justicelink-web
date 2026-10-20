package lcdjp.storage;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

/**
 * Makes every JSON response swap a stored file reference for its download URL, so controllers, repositories and
 * the frontend keep working with the same column names. Only Spring MVC's ObjectMapper is affected (the Redis
 * cache keeps its own serializer and stores the raw reference).
 */
@Configuration
public class FileRefJacksonConfig {

    @Bean
    public Module fileRefModule(FileRefService fileRefService) {
        SimpleModule module = new SimpleModule("FileRefModule");
        module.addSerializer(String.class, new StdSerializer<String>(String.class) {
            @Override
            public void serialize(String value, JsonGenerator gen, SerializerProvider provider) throws IOException {
                gen.writeString(fileRefService.resolveForClient(value));
            }
        });
        return module;
    }
}
