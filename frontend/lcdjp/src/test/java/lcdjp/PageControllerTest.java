package lcdjp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PageControllerTest {

    private final PageController controller = new PageController();

    @Test
    void index_forwardsToAppShell() {
        assertEquals("forward:/index.html", controller.index());
    }

    @Test
    void login_forwardsToAppShell() {
        assertEquals("forward:/index.html", controller.login());
    }

    @Test
    void home_forwardsToAppShell() {
        assertEquals("forward:/index.html", controller.home());
    }

    @Test
    void app_forwardsToAppShell() {
        assertEquals("forward:/index.html", controller.app());
    }

    @Test
    void favicon_returnsNoContent_ratherThanForwardingToAppShell() {
        var result = controller.favicon();

        assertEquals(204, result.getStatusCode().value());
        assertNull(result.getBody());
    }
}
