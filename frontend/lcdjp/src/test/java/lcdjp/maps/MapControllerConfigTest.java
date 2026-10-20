package lcdjp.maps;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MapControllerConfigTest {

    private MapController controllerWith(String publicKey, String apiKey, String mapId) {
        GoogleMapsProperties props = new GoogleMapsProperties();
        props.setPublicKey(publicKey);
        props.setApiKey(apiKey);
        props.setMapId(mapId);
        MapController controller = new MapController();
        ReflectionTestUtils.setField(controller, "googleMapsProperties", props);
        return controller;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> config(MapController controller) {
        ResponseEntity<?> response = controller.getMapConfig();
        assertEquals(200, response.getStatusCode().value());
        return (Map<String, Object>) response.getBody();
    }

    @Test
    void config_includesConfiguredMapId() {
        Map<String, Object> body = config(controllerWith("pub-key", "api-key", "b15458693c7d302b939562cc"));
        assertEquals("b15458693c7d302b939562cc", body.get("mapId"));
        assertEquals("pub-key", body.get("mapsApiKey"));
    }

    @Test
    void config_trimsMapId() {
        Map<String, Object> body = config(controllerWith("pub-key", "api-key", "  abc123  "));
        assertEquals("abc123", body.get("mapId"));
    }

    @Test
    void config_returnsEmptyMapIdWhenMissingOrUnresolved() {
        assertEquals("", config(controllerWith("k", "k", null)).get("mapId"));
        assertEquals("", config(controllerWith("k", "k", "  ")).get("mapId"));
        assertEquals("", config(controllerWith("k", "k", "${GOOGLE_MAPS_MAP_ID}")).get("mapId"));
    }

    @Test
    void config_fallsBackToApiKeyWhenPublicKeyMissing() {
        Map<String, Object> body = config(controllerWith("", "server-key", "m1"));
        assertEquals("server-key", body.get("mapsApiKey"));
    }
}
