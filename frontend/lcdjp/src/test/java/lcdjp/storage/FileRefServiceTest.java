package lcdjp.storage;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class FileRefServiceTest {

    private static final ObjectStorageService CONFIGURED =
            new ObjectStorageService("https://acct.r2.cloudflarestorage.com", "bucket", "key", "secret", "auto");

    private static FileRefService service() {
        return new FileRefService(CONFIGURED, "", "jwt-secret-for-tests-0123456789");
    }

    private static String dataUri(String mime, int size) {
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(new byte[size]);
    }

    @Test
    void downloadTokenRoundTripsAndExpires() {
        FileRefService f = service();
        FileRefService.Parsed p = new FileRefService.Parsed("image/png", "documents/2026/10/abc");
        String token = f.createToken(p, 2_000_000_000L);
        assertEquals(p, f.readToken(token, 1_000L));
        assertNull(f.readToken(token, 2_000_000_001L));
    }

    @Test
    void tamperedOrForeignTokensAreRejected() {
        FileRefService f = service();
        String token = f.createToken(new FileRefService.Parsed("image/png", "documents/x"), 2_000_000_000L);
        assertNull(f.readToken(token.substring(0, token.length() - 2) + "AA", 1_000L));
        assertNull(new FileRefService(CONFIGURED, "another-secret", "").readToken(token, 1_000L));
        assertNull(f.readToken("garbage", 1_000L));
        assertNull(f.readToken(null, 1_000L));
    }

    @Test
    void textThatLooksLikeAReferenceIsNeverResolved() {
        FileRefService f = service();
        String forged = "objref:v1:image/png:documents/someone-elses-file:AAAA";
        assertEquals(forged, f.resolveForClient(forged));
        assertEquals("hello", f.resolveForClient("hello"));
        assertNull(f.resolveForClient(null));
    }

    @Test
    void ordinaryAndUnsupportedValuesAreLeftAlone() {
        FileRefService f = service();
        assertEquals("not a file", f.externalizeIfDataUri("not a file", "documents"));
        String html = dataUri("text/html", 100);
        assertEquals(html, f.externalizeIfDataUri(html, "documents"));
    }

    @Test
    void doesNothingWhenStorageIsNotConfigured() {
        FileRefService off = new FileRefService(new ObjectStorageService("", "", "", "", ""), "", "x");
        String png = dataUri("image/png", 200);
        assertFalse(off.enabled());
        assertEquals(png, off.externalizeIfDataUri(png, "documents"));
    }

    @Test
    void recognisesItsOwnDownloadUrls() {
        FileRefService f = service();
        assertTrue(f.isFileUrl("/api/files/abc.def"));
        assertFalse(f.isFileUrl("data:image/png;base64,AAAA"));
        assertFalse(f.isFileUrl(null));
    }
}
