package lcdjp;

import org.apache.catalina.Context;
import org.apache.catalina.session.StandardManager;
import org.springframework.boot.web.embedded.tomcat.TomcatContextCustomizer;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SessionPersistenceConfig implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.addContextCustomizers((TomcatContextCustomizer) (Context context) -> {
            StandardManager manager = new StandardManager();

            manager.setPathname(null);
            context.setManager(manager);
        });
    }
}
