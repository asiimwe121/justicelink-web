package lcdjp.notification;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmailTemplateTest {

    @Test
    void wrapsBodyWithAbsoluteLogoUrl() {
        String html = EmailTemplate.wrap("https://example.org/", "<p>Hello</p>");
        assertTrue(html.contains("src=\"https://example.org/images/justicelink-email-logo.png\""));
        assertTrue(html.contains("<p>Hello</p>"));
        assertTrue(html.contains("alt=\"JusticeLink"));
    }

    @Test
    void fallsBackToDefaultBaseUrlAndDoesNotWrapTwice() {
        String once = EmailTemplate.wrap("  ", "x");
        assertTrue(once.contains("https://justicelinkug.org/images/justicelink-email-logo.png"));
        assertEquals(once, EmailTemplate.wrap("https://example.org", once));
        assertDoesNotThrow(() -> EmailTemplate.wrap(null, null));
    }
}
